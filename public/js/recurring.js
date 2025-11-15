import{i}from"./navigation-BDLIzq93.js";import{i as c}from"./profile-BEROGLl0.js";i();c();async function d(){try{const e=await(await fetch("/api/recurring")).json(),n=document.querySelector("#recurringTable tbody"),o=document.getElementById("recurringSummary");if(!n)return;if(n.innerHTML="",Array.isArray(e.items)&&e.items.length)e.items.forEach(t=>{const a=document.createElement("tr");a.innerHTML=`
          <td>${t.name}</td>
          <td>${t.sampleAmount} ₽</td>
          <td>${t.frequency||t.avgPeriodDays+" дней"}</td>
          <td>${t.nextDate||"—"}</td>
        `,n.appendChild(a)});else{const t=document.createElement("tr");t.innerHTML='<td colspan="4">Регулярные операции ещё не добавлены</td>',n.appendChild(t)}if(o){const t=e.monthly?`${e.monthly} ₽`:"0 ₽";o.textContent=`Суммарная ежемесячная нагрузка: ${t}`}}catch(r){console.error("Не удалось загрузить повторяющиеся операции",r)}}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",d):d();
