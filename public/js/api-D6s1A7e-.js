async function a(t){
	try{
		const e={Accept:"application/json","Cache-Control":"no-cache"};
		let r=await fetch(t,{method:"GET",cache:"no-store",credentials:"include",headers:e});
		if(!r.ok){
			if(r.status===304){
				const n=t+(t.includes("?")?"&":"?")+`_ts=${Date.now()}`;
				const s=await fetch(n,{method:"GET",cache:"no-store",credentials:"include",headers:e});
				if(s.ok){return await s.json()}
			}
			const o=await r.json().catch(()=>({}));
			throw new Error(o.error||`HTTP ${r.status}: ${r.statusText}`)
		}
		return await r.json()
	}catch(r){
		throw r instanceof Error?r:new Error(`Ошибка запроса: ${r}`)
	}
}
export{a as f};
