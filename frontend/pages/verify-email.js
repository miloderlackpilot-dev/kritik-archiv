import { useEffect,useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import axios from 'axios';
const API=process.env.NEXT_PUBLIC_API_URL||'http://localhost:5000';
export default function VerifyEmail(){const router=useRouter();const [state,setState]=useState({loading:true,message:'',error:''});useEffect(()=>{if(!router.isReady)return;axios.post(`${API}/api/auth/verify-email`,{token:router.query.token}).then(r=>setState({loading:false,message:r.data.message,error:''})).catch(e=>setState({loading:false,message:'',error:e.response?.data?.error||'Verifizierung fehlgeschlagen'}));},[router.isReady,router.query.token]);return <div className="container" style={{maxWidth:520}}><div className="card"><h1>E-Mail-Verifizierung</h1>{state.loading?<p>Prüfe Verifizierungslink...</p>:state.error?<div className="alert error">{state.error}</div>:<div className="alert success">{state.message}</div>}<p style={{marginTop:16}}><Link href="/login">Zur Anmeldung</Link></p></div></div>;}
