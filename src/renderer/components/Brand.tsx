/** 以显示视窗去掉定稿原图四周留白，不重绘或修改字形。 */
export function Brand() {
  return <div className="brand">
    <img className="brand-icon" src="/brand/app-route-inline.svg" width={44} height={44} alt="" />
    <div className="brand-copy">
      <svg className="brand-wordmark" viewBox="112 172 1756 466" role="img" aria-label="AppRoute">
        <image href="/brand/app-route-wordmark.png" width="1983" height="793" />
      </svg>
      <span className="brand-tagline">应用分流 · 各走其路</span>
    </div>
  </div>
}
