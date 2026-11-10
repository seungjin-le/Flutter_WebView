export default function App() {
  return (
    <>
      <header className="header">
        <div className="header-content">
          <span className="brand">Luckieverse</span>
          <span className="service">Master</span>
        </div>
      </header>
      <main>
        <h1>관리 콘솔</h1>
        <p className="description">Luckieverse 서비스 관리</p>
        <section className="empty-state" aria-label="관리 메뉴">
          <p>등록된 관리 메뉴가 없어.</p>
        </section>
      </main>
    </>
  )
}
