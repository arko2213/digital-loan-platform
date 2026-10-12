import { LoaderCircle, ArrowUpRight, Info } from 'lucide-react';
export function Button({ children, variant='primary', className='', ...props }) { return <button className={`btn btn-${variant} ${className}`} {...props}>{children}</button>; }
export function Spinner({ label='Loading' }) { return <div className="loading"><LoaderCircle className="spin" size={22}/><span>{label}</span></div>; }
export function Notice({ children, type='info' }) { return <div className={`notice notice-${type}`}><Info size={17}/><span>{children}</span></div>; }
export function PageHeader({ eyebrow, title, subtitle, action }) { return <div className="page-header"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{subtitle&&<p>{subtitle}</p>}</div>{action}</div>; }
export function SectionHeading({ eyebrow, title, subtitle, link }) { return <div className="section-heading"><div><div className="eyebrow">{eyebrow}</div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div>{link&&<a className="text-link" href={link.href}>{link.label} <ArrowUpRight size={15}/></a>}</div>; }
