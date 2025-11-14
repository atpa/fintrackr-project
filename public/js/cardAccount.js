function i(i,t="USD"){return`${Number(i).toLocaleString("ru-RU",{minimumFractionDigits:2,maximumFractionDigits:2})} ${{USD:"$",EUR:"€",PLN:"zł",RUB:"₽"}[t]||t}`}export{i as f};
