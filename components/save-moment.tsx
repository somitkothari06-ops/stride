"use client";
import {useEffect,useState} from 'react';
import {PipMark} from './companion';
export default function SaveMoment({sequence}:{sequence:number}){
 const [visible,setVisible]=useState(false);
 useEffect(()=>{if(!sequence){setVisible(false);return;}setVisible(true);window.dispatchEvent(new Event("stride-celebrate"));const timer=setTimeout(()=>setVisible(false),2400);return()=>clearTimeout(timer);},[sequence]);
 return visible?<div className="save-moment" key={sequence} role="status"><PipMark/><span>One more step, kept.</span><i aria-hidden="true">✦</i></div>:null;
}
