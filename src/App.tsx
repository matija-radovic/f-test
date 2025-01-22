import './App.css'
import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider } from 'react-router-dom'
import { Layout } from './components'
import Main from './pages/main'
import Test from './pages/test'

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path='/' element={<Layout />}>
      <Route index element={<Main />} />
      {
        //*
        <Route path='/test' element={<Test />} />
        //*/
      }
    </Route>
  )
)

const App = () => <RouterProvider router={router} />

export default App
