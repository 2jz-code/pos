import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import POS from "./pages/POS";
import Dashboard from "./pages/Dashboard";

function App() {
  return (
    <Router>
      <div className="w-full h-screen flex flex-col">
        <div className="flex-grow">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pos" element={<POS />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
