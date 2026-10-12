import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import { Login, Register } from './pages/Auth';
import Dashboard from './pages/Dashboard';
import { Compare, LoanDetails } from './pages/Loans';
import { Calculator, Eligibility } from './pages/Tools';
import { Advisor, About, NotFound, Admin } from './pages/Other';
import './styles.css';
function Guard({ children, admin=false }) { const { user } = useAuth(); if (!user) return <Navigate to="/login" replace/>; if (admin && user.role !== 'admin') return <Navigate to="/dashboard" replace/>; return children; }
function AppRoutes() { return <Routes><Route element={<Layout/>}><Route path="/" element={<Home/>}/><Route path="/login" element={<Login/>}/><Route path="/register" element={<Register/>}/><Route path="/compare" element={<Compare/>}/><Route path="/loans/:id" element={<LoanDetails/>}/><Route path="/calculator" element={<Calculator/>}/><Route path="/eligibility" element={<Eligibility/>}/><Route path="/advisor" element={<Advisor/>}/><Route path="/about" element={<About/>}/><Route path="/dashboard" element={<Guard><Dashboard/></Guard>}/><Route path="/admin" element={<Guard admin><Admin/></Guard>}/><Route path="*" element={<NotFound/>}/></Route></Routes>; }
export default function App() { return <BrowserRouter><AuthProvider><AppRoutes/></AuthProvider></BrowserRouter>; }
