import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./components/Dashboard";
import SearchPanel from "./components/SearchPanel";
import Watchlist from "./components/Watchlist";
import Settings from "./components/Settings";
import ItemDetail from "./components/ItemDetail";
import ComparePage from "./components/ComparePage";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/search" element={<SearchPanel />} />
        <Route path="/watchlist" element={<Watchlist />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/item/:id" element={<ItemDetail />} />
        <Route path="/compare" element={<ComparePage />} />
      </Routes>
    </Layout>
  );
}
