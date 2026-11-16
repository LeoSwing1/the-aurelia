import Image from "next/image";
export function PageHeroMedia({src,alt=""}:{src:string;alt?:string}){
 return <div className="page-hero-media" aria-hidden={alt===""}><Image src={src} alt={alt} fill priority sizes="100vw" quality={78}/><span className="page-hero-overlay"/></div>;
}
