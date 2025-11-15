/**
 * Модуль графиков с ApexCharts
 * Красивые анимированные графики для dashboard, reports и forecast
 */

// Загрузка ApexCharts из CDN
let apexChartsLoaded = false;
let loadPromise = null;

/**
 * Загружает библиотеку ApexCharts, если ещё не загружена
 */
function loadApexCharts() {
  if (apexChartsLoaded) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    // Если ApexCharts уже загружен глобально
    if (window.ApexCharts) {
      apexChartsLoaded = true;
      console.log('✅ ApexCharts already loaded');
      resolve();
      return;
    }

    console.log('⏳ Loading ApexCharts from CDN...');
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/apexcharts@3.45.1/dist/apexcharts.min.js';
    script.onload = () => {
      apexChartsLoaded = true;
      console.log('✅ ApexCharts loaded successfully');
      resolve();
    };
    script.onerror = (error) => {
      console.error('❌ Failed to load ApexCharts:', error);
      reject(error);
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

/**
 * Получает цвета из CSS переменных
 */
function getThemeColors() {
  const styles = getComputedStyle(document.documentElement);
  return {
    primary: styles.getPropertyValue('--primary').trim() || '#6366f1',
    primaryLight: styles.getPropertyValue('--primary-light').trim() || '#818cf8',
    accent: styles.getPropertyValue('--accent').trim() || '#10b981',
    danger: styles.getPropertyValue('--danger').trim() || '#ef4444',
    text: styles.getPropertyValue('--text').trim() || '#1a202c',
    textSecondary: styles.getPropertyValue('--text-secondary').trim() || '#64748b',
    bgBase: styles.getPropertyValue('--bg-base').trim() || '#ffffff',
    bgElevated: styles.getPropertyValue('--bg-elevated').trim() || '#f8fafc',
    borderColor: styles.getPropertyValue('--border-color').trim() || '#e2e8f0',
  };
}

/**
 * Базовые опции для всех графиков
 */
function getBaseOptions() {
  const colors = getThemeColors();
  const isDark = document.documentElement.classList.contains('dark') || 
                 document.body.classList.contains('dark');

  return {
    chart: {
      fontFamily: 'Inter, system-ui, sans-serif',
      background: 'transparent',
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: false,
          zoom: false,
          zoomin: false,
          zoomout: false,
          pan: false,
          reset: false,
        },
      },
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 800,
        animateGradually: {
          enabled: true,
          delay: 150,
        },
        dynamicAnimation: {
          enabled: true,
          speed: 350,
        },
      },
    },
    theme: {
      mode: isDark ? 'dark' : 'light',
    },
    colors: [colors.primary, colors.accent, colors.danger, colors.primaryLight, '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'],
    dataLabels: {
      enabled: false,
    },
    grid: {
      borderColor: colors.borderColor,
      strokeDashArray: 4,
      padding: {
        top: 0,
        right: 10,
        bottom: 0,
        left: 10,
      },
    },
    tooltip: {
      theme: isDark ? 'dark' : 'light',
      style: {
        fontSize: '14px',
      },
    },
  };
}

/**
 * Создаёт столбчатую диаграмму
 * @param {string} elementId - ID элемента контейнера
 * @param {string[]} labels - Подписи категорий
 * @param {number[]} values - Значения
 * @param {string} [currency='USD'] - Валюта для отображения
 */
export async function renderBarChart(elementId, labels, values, currency = 'USD') {
  console.log(`📊 Rendering bar chart: ${elementId}`, { labels, values, currency });
  
  await loadApexCharts();
  
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`❌ Element not found: ${elementId}`);
    return;
  }

  console.log(`✅ Element found: ${elementId}`, element);
  
  // Очищаем предыдущий график
  element.innerHTML = '';

  const colors = getThemeColors();
  const options = {
    ...getBaseOptions(),
    chart: {
      ...getBaseOptions().chart,
      type: 'bar',
      height: 350,
    },
    plotOptions: {
      bar: {
        borderRadius: 8,
        horizontal: false,
        columnWidth: '60%',
        dataLabels: {
          position: 'top',
        },
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => val.toFixed(0),
      offsetY: -20,
      style: {
        fontSize: '12px',
        colors: [colors.text],
      },
    },
    series: [{
      name: 'Расход',
      data: values,
    }],
    xaxis: {
      categories: labels,
      labels: {
        style: {
          colors: colors.textSecondary,
          fontSize: '12px',
        },
        rotate: labels.length > 5 ? -45 : 0,
        trim: true,
        maxHeight: 100,
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: colors.textSecondary,
        },
        formatter: (val) => val.toFixed(0) + ' ' + currency,
      },
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'light',
        type: 'vertical',
        shadeIntensity: 0.25,
        gradientToColors: [colors.primaryLight],
        inverseColors: false,
        opacityFrom: 1,
        opacityTo: 0.85,
        stops: [0, 100],
      },
    },
  };

  const chart = new ApexCharts(element, options);
  chart.render();
  
  return chart;
}

/**
 * Создаёт круговую диаграмму (donut)
 * @param {string} elementId - ID элемента контейнера
 * @param {string[]} labels - Подписи категорий
 * @param {number[]} values - Значения
 * @param {string} [currency='USD'] - Валюта для отображения
 */
export async function renderDonutChart(elementId, labels, values, currency = 'USD') {
  console.log(`🍩 Rendering donut chart: ${elementId}`, { labels, values, currency });
  
  await loadApexCharts();
  
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`❌ Element not found: ${elementId}`);
    return;
  }

  console.log(`✅ Element found: ${elementId}`, element);
  
  // Очищаем предыдущий график
  element.innerHTML = '';

  const colors = getThemeColors();
  const options = {
    ...getBaseOptions(),
    chart: {
      ...getBaseOptions().chart,
      type: 'donut',
      height: 350,
    },
    series: values,
    labels: labels,
    plotOptions: {
      pie: {
        donut: {
          size: '65%',
          labels: {
            show: true,
            name: {
              show: true,
              fontSize: '14px',
              color: colors.textSecondary,
            },
            value: {
              show: true,
              fontSize: '24px',
              fontWeight: 600,
              color: colors.text,
              formatter: (val) => parseFloat(val).toFixed(0) + ' ' + currency,
            },
            total: {
              show: true,
              label: 'Всего',
              fontSize: '14px',
              color: colors.textSecondary,
              formatter: (w) => {
                const total = w.globals.seriesTotals.reduce((a, b) => a + b, 0);
                return total.toFixed(0) + ' ' + currency;
              },
            },
          },
        },
      },
    },
    legend: {
      position: 'bottom',
      horizontalAlign: 'center',
      fontSize: '13px',
      labels: {
        colors: colors.text,
      },
      markers: {
        width: 12,
        height: 12,
        radius: 3,
      },
    },
    stroke: {
      width: 2,
      colors: [colors.bgBase],
    },
    responsive: [{
      breakpoint: 768,
      options: {
        chart: {
          height: 300,
        },
        legend: {
          position: 'bottom',
        },
      },
    }],
  };

  const chart = new ApexCharts(element, options);
  chart.render();
  
  return chart;
}

/**
 * Создаёт график с несколькими столбцами (для сравнения)
 * @param {string} elementId - ID элемента контейнера
 * @param {string[]} labels - Подписи категорий
 * @param {Array<{name: string, data: number[]}>} series - Серии данных
 * @param {string} [currency='USD'] - Валюта для отображения
 */
export async function renderMultiBarChart(elementId, labels, series, currency = 'USD') {
  await loadApexCharts();
  
  const element = document.getElementById(elementId);
  if (!element) return;

  // Очищаем предыдущий график
  element.innerHTML = '';

  const colors = getThemeColors();
  const options = {
    ...getBaseOptions(),
    chart: {
      ...getBaseOptions().chart,
      type: 'bar',
      height: 350,
    },
    plotOptions: {
      bar: {
        borderRadius: 8,
        horizontal: false,
        columnWidth: '55%',
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => val.toFixed(0),
      offsetY: -20,
      style: {
        fontSize: '12px',
        colors: [colors.text],
      },
    },
    series: series,
    xaxis: {
      categories: labels,
      labels: {
        style: {
          colors: colors.textSecondary,
          fontSize: '12px',
        },
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: colors.textSecondary,
        },
        formatter: (val) => val.toFixed(0) + ' ' + currency,
      },
    },
    legend: {
      position: 'top',
      horizontalAlign: 'left',
      fontSize: '13px',
      labels: {
        colors: colors.text,
      },
      markers: {
        width: 12,
        height: 12,
        radius: 3,
      },
    },
    fill: {
      opacity: 1,
    },
  };

  const chart = new ApexCharts(element, options);
  chart.render();
  
  return chart;
}

/**
 * Создаёт линейный график (для трендов)
 * @param {string} elementId - ID элемента контейнера
 * @param {string[]} labels - Подписи временных точек
 * @param {Array<{name: string, data: number[]}>} series - Серии данных
 * @param {string} [currency='USD'] - Валюта для отображения
 */
export async function renderLineChart(elementId, labels, series, currency = 'USD') {
  await loadApexCharts();
  
  const element = document.getElementById(elementId);
  if (!element) return;

  // Очищаем предыдущий график
  element.innerHTML = '';

  const colors = getThemeColors();
  const options = {
    ...getBaseOptions(),
    chart: {
      ...getBaseOptions().chart,
      type: 'area',
      height: 350,
      zoom: {
        enabled: false,
      },
    },
    stroke: {
      curve: 'smooth',
      width: 3,
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.1,
        stops: [0, 90, 100],
      },
    },
    series: series,
    xaxis: {
      categories: labels,
      labels: {
        style: {
          colors: colors.textSecondary,
          fontSize: '12px',
        },
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: colors.textSecondary,
        },
        formatter: (val) => val.toFixed(0) + ' ' + currency,
      },
    },
    legend: {
      position: 'top',
      horizontalAlign: 'left',
      fontSize: '13px',
      labels: {
        colors: colors.text,
      },
      markers: {
        width: 12,
        height: 12,
        radius: 3,
      },
    },
    markers: {
      size: 4,
      strokeWidth: 2,
      hover: {
        size: 7,
      },
    },
  };

  const chart = new ApexCharts(element, options);
  chart.render();
  
  return chart;
}

export default {
  renderBarChart,
  renderDonutChart,
  renderMultiBarChart,
  renderLineChart,
};
