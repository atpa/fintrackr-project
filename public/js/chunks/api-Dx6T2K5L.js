async function t(t){const n=await fetch(t);if(!n.ok)return[];try{return await n.json()}catch(r){return[]}}export{t as f};
