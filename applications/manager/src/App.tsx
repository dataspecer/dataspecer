import './App.css';
import Dir from "./Dir";
import { GithubLink } from './components/github-link';
import { LanguageToggle } from './components/language-toggle';
import { ModeToggle } from './components/mode-toggle';
import { SortModels } from './components/sort-models';
import { BetterModalProvider } from './lib/better-modal';
import { ResourcesContext, useResourcesContext } from './package';
import { useTranslation } from "react-i18next";
import { Toaster } from "@/components/ui/sonner"
import { VersionInformation } from './components/version-information';
import { LoginCard } from './components/login-card';
import { useLogin } from './hooks/use-login';

const version = import.meta.env.VITE_VERSION || null;

function App() {
  const {resources} = useResourcesContext();
  const {t} = useTranslation();
  const login = useLogin();

  return (
    <ResourcesContext.Provider value={resources}>
      <BetterModalProvider>
        <div className='relative flex min-h-screen flex-col bg-background'>
          <header className='sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
            <div className='container flex h-14 items-center justify-between'>
              <div className='flex gap-2'>
                <div className='flex items-center gap-2'>
                  <span>
                    <strong>Dataspecer</strong> {t('dataspecer-packages')}
                  </span>
                  <VersionInformation />
                </div>
                {version &&
                  <div className='inline-flex items-center rounded-full px-2.5 py-1 text-sm bg-purple-500/10 text-purple-800 dark:text-purple-400'>
                    {version}
                  </div>
                }
              </div>
              <div className='flex gap-2'>
                <SortModels />
                <GithubLink />
                <ModeToggle />
                <LanguageToggle/>
                <LoginCard login={login} />
              </div>
            </div>
          </header>
          <main className='flex-1 container items-start pt-5'>
            <Dir />
          </main>
        </div>
      </BetterModalProvider>
      <Toaster />
    </ResourcesContext.Provider>
  )
}

export default App
