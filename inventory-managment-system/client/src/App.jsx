import { Routes, Route } from "react-router-dom"
import NotFoundPage from "@/pages/NotFoundPage";
import TableSkeleton from "./components/skeletons/TableSkeleton";
import DashboardSkeleton from "./components/skeletons/DashboardSkeleton";
const App = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <TableSkeleton />
    </div>
  )
}

export default App