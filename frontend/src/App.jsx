import { Routes, Route } from 'react-router-dom'
import { ContractProvider } from './context/ContractContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import ContractList from './pages/ContractList'
import ContractDetail from './pages/ContractDetail'
import CalendarView from './pages/CalendarView'
import RecycleBin from './pages/RecycleBin'

function App() {
  return (
    <ContractProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="contracts" element={<ContractList />} />
          <Route path="contracts/:id" element={<ContractDetail />} />
          <Route path="calendar" element={<CalendarView />} />
          <Route path="recycle" element={<RecycleBin />} />
        </Route>
      </Routes>
    </ContractProvider>
  )
}

export default App
