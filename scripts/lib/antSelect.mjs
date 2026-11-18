/** 等待 Ant 弹层及父弹窗完成展开；可见并不代表定位和动画已经结束。 */
export async function waitForAntMotion(page, locator) {
  await locator.waitFor({ state: 'visible' })
  const element = await locator.elementHandle()
  try {
    await page.evaluate(async () => {
      await document.fonts.ready
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    })
    await page.waitForFunction(element => {
      if (!element?.isConnected) return false
      for (let current = element; current; current = current.parentElement) {
        if ([...current.classList].some(name => /^ant-.*-(appear|enter|leave)(-|$)/.test(name))) return false
        if (current.getAnimations().some(animation => animation.playState === 'running' || animation.pending)) return false
      }
      return true
    }, element)
  } finally { await element.dispose() }
}

/** 真实点击一次，核对关闭和选中值；不强制点击、不重试、不通过 Esc 掩盖未选中。 */
export async function chooseAntOption(page, select, label, expectedLabel) {
  await waitForAntMotion(page, select)
  await select.click()
  const popup = page.locator('.ant-select-dropdown:visible')
  await waitForAntMotion(page, popup)
  const option = popup.locator('.ant-select-item-option-content').getByText(label, { exact: true })
  const selectedLabel = await option.innerText()
  await option.click()
  await popup.waitFor({ state: 'hidden' })
  await select.getByText(expectedLabel ?? selectedLabel, { exact: true }).waitFor()
  return selectedLabel
}
