import assert from 'node:assert/strict'
import { waitForState } from './testSandbox.mjs'

async function settleLayout(page) {
  await page.evaluate(async () => {
    await document.fonts.ready
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  })
}

async function windowGeometry(window, page) {
  const native = await window.evaluate(win => ({ size: win.getContentSize(), zoom: win.webContents.getZoomFactor(), maximized: win.isMaximized() }))
  const content = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }))
  return { native, content }
}

const matchesWindow = ({ native, content }) => Math.abs(native.size[0] - content.width * native.zoom) <= 1 && Math.abs(native.size[1] - content.height * native.zoom) <= 1

/** 同时核对原生内容区和 DOM，避免裁剪后的网页截图隐藏窗口右侧/底部空白。 */
export async function assertDesktopWindowFilled(desktop, page, label = 'desktop') {
  const window = await desktop.browserWindow(page)
  try {
    const geometry = await windowGeometry(window, page)
    assert.ok(matchesWindow(geometry), `${label}: 网页视口未铺满原生内容区 ${JSON.stringify(geometry)}`)
    const layout = await page.evaluate(() => {
      const rect = selector => document.querySelector(selector)?.getBoundingClientRect().toJSON()
      let scrollbarCompensation = 0
      // Ant Design 锁定滚动时会保留一条滚动条宽度；按本机实测值核对，不放宽成任意留白。
      const openDialog = [...document.querySelectorAll('[role=dialog]')].some(element => element.getClientRects().length && getComputedStyle(element).visibility === 'visible')
      if (openDialog && getComputedStyle(document.body).overflowY === 'hidden') {
        const probe = document.createElement('div')
        probe.style.cssText = 'position:fixed;visibility:hidden;width:100px;height:100px;overflow:scroll;'
        document.body.append(probe)
        scrollbarCompensation = probe.offsetWidth - probe.clientWidth
        probe.remove()
      }
      return { clientWidth: document.documentElement.clientWidth, scrollbarCompensation, root: rect('#root'), shell: rect('.app-shell'), sidebar: rect('.sidebar') }
    })
    for (const box of [layout.root, layout.shell]) {
      const fillsWidth = box && [layout.clientWidth, layout.clientWidth - layout.scrollbarCompensation].some(width => Math.abs(box.width - width) <= 1)
      assert.ok(box && Math.abs(box.left) <= 1 && fillsWidth && box.height >= geometry.content.height - 1,
        `${label}: 应用框架未填满内容区 ${JSON.stringify(layout)}`)
    }
    assert.ok(layout.sidebar && Math.abs(layout.sidebar.top) <= 1 && Math.abs(layout.sidebar.bottom - geometry.content.height) <= 1, `${label}: 侧栏未延伸至窗口底部`)
    return geometry
  } finally { await window.dispose() }
}

/** 只改变真实 BrowserWindow，不使用会让可见窗口留白的网页视口模拟。 */
export async function setDesktopViewport(desktop, page, size) {
  const window = await desktop.browserWindow(page)
  try {
    await window.evaluate(win => { if (win.isMaximized()) win.unmaximize(); if (win.isMinimized()) win.restore() })
    await waitForState('恢复普通窗口', () => window.evaluate(win => !win.isMaximized() && !win.isMinimized()), Boolean)
    await window.evaluate((win, requested) => win.setContentSize(requested.width, requested.height), size)
    // CI 的可用屏幕可能限制尺寸；记录实际尺寸，不把请求值冒充验收值。
    await waitForState('原生窗口与网页尺寸一致', () => windowGeometry(window, page), matchesWindow)
    await settleLayout(page)
    const actual = await assertDesktopWindowFilled(desktop, page)
    return { requested: size, ...actual }
  } finally { await window.dispose() }
}

export async function checkDesktopMaximizeRestore(desktop, page) {
  const window = await desktop.browserWindow(page)
  try {
    const before = await window.evaluate(win => win.getContentSize())
    await window.evaluate(win => win.maximize())
    await waitForState('最大化窗口', () => window.evaluate(win => win.isMaximized()), Boolean)
    await waitForState('最大化后视口同步', () => windowGeometry(window, page), matchesWindow)
    await settleLayout(page)
    const maximized = await assertDesktopWindowFilled(desktop, page, 'maximized')
    await window.evaluate(win => win.unmaximize())
    await waitForState('还原窗口', () => window.evaluate(win => !win.isMaximized()), Boolean)
    await waitForState('还原后视口同步', () => windowGeometry(window, page), matchesWindow)
    await settleLayout(page)
    const restored = await assertDesktopWindowFilled(desktop, page, 'restored')
    assert.deepEqual(restored.native.size, before, '还原后应回到原来的内容区大小')
    return { maximized, restored }
  } finally { await window.dispose() }
}
