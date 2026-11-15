import { CaseView } from './CaseView.tsx';
import { Dashboard } from './Dashboard.tsx';
import { DistrictEditor, Districts } from './Districts.tsx';
import { Privacy, Settings } from './Pages.tsx';
import { Reference } from './Reference.tsx';
import { Report } from './Report.tsx';
import { AppProvider, useApp } from './state.tsx';

function Shell() {
  const { route } = useApp();
  const at = (pages: string[]) => (pages.includes(route.page) ? 'page' : undefined);
  const wide = route.page === 'case';
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="masthead">
        <div className="masthead-in">
          <a className="wordmark" href="#/" aria-label="evalua, home">
            <span className="seal" aria-hidden="true"><span>ev</span></span>
            evalua
          </a>
          <nav className="nav" aria-label="Main">
            <a href="#/" aria-current={at(['cases', 'case', 'report'])}>Cases</a>
            <a href="#/districts" aria-current={at(['districts', 'district'])}>Districts</a>
            <a href="#/reference" aria-current={at(['reference'])}>Reference</a>
            <a href="#/privacy" aria-current={at(['privacy'])}>Privacy</a>
            <a href="#/settings" aria-current={at(['settings'])}>Settings</a>
          </nav>
          <a className="local-note" href="#/privacy" style={{ textDecoration: 'none' }}>Records stay on this device</a>
        </div>
      </header>
      <main id="main" className={wide ? 'wide' : ''} tabIndex={-1}>
        {route.page === 'cases' && <Dashboard />}
        {route.page === 'case' && <CaseView key={route.id} id={route.id!} />}
        {route.page === 'report' && <Report id={route.id!} />}
        {route.page === 'districts' && <Districts />}
        {route.page === 'district' && <DistrictEditor key={route.id} id={route.id!} />}
        {route.page === 'reference' && <Reference id={route.id} />}
        {route.page === 'privacy' && <Privacy />}
        {route.page === 'settings' && <Settings />}
      </main>
    </>
  );
}

export function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
