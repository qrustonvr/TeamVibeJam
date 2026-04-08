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
        style={{ background: 'linear-gradient(160deg, #080f08 0%, #050c05 100%)' }}
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
