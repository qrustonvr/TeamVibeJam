import { GameProvider } from '@/context/GameContext'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { GameTable } from '@/components/layout/GameTable'
import { DropGame } from '@/components/game/DropGame'

function App() {
  return (
    <GameProvider>
      <div
        className="flex flex-col h-full"
        style={{ background: 'transparent' }}
      >
        <Header />
        <GameTable>
          <DropGame />
        </GameTable>
        <Footer />
      </div>
    </GameProvider>
  )
}

export default App
