import { useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
export default function ForgotPassword() {
  const [email,setEmail]=useState(''); const [message,setMessage]=useState(''); const [error,setError]=useState('');
  async function submit(e){e.preventDefault();setError('');setMessage('');try{const r=await axios.post(`${API}/api/auth/request-password-reset`,{email});setMessage(r.data.message);}catch(err){setError(err.response?.data?.error||'Anfrage fehlgeschlagen');}}
  return <div className="container" style={{maxWidth:520}}><p><Link href="/login">← Zur Anmeldung</Link></p><div className="card"><h1>Passwort zurücksetzen</h1><p className="small">Gib deine E-Mail-Adresse ein. Falls ein Konto existiert, wird ein Reset-Link erstellt.</p>{error&&<div className="alert error">{error}</div>}{message&&<div className="alert success">{message}</div>}<form onSubmit={submit}><label>E-Mail<input className="input" type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><button className="button" style={{marginTop:16}} type="submit">Reset-Link anfordern</button></form></div></div>;
}