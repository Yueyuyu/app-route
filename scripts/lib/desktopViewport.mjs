// 响应式验收固定网页内容尺寸；原生窗口可能被 CI 虚拟屏幕限制，不能当作已达到目标宽度。
export async function setDesktopViewport(page, size) {
  await page.setViewportSize(size)
  await page.waitForFunction(({ width, height }) => innerWidth === width && innerHeight === height, size, { timeout: 5000 })
  await page.evaluate(async () => {
    await document.fonts.ready
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  })
}
