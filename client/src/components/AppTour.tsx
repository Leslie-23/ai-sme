import { useEffect, useState } from 'react';
import { Joyride, STATUS, Step, EventData } from 'react-joyride';

const TOUR_KEY = 'ai_sme_app_tour_done_v1';

const steps: Step[] = [
  {
    target: '[data-tour="nav"]',
    title: 'Your workspace',
    content: 'Move between sales, inventory, imports, reports, Intellexa, pricing, privacy, and settings from here.',
    placement: 'right',
  },
  {
    target: '[data-tour="dashboard-kpis"]',
    title: 'Owner snapshot',
    content: 'Track current sales and compare them with yesterday, last week, and last month at a glance.',
  },
  {
    target: '[data-tour="intellexa-panel"]',
    title: 'Intellexa',
    content: 'Ask business-data questions about sales, stock, expenses, profit, and actions. The default range is month-to-date.',
  },
  {
    target: '[data-tour="attention-panel"]',
    title: 'What needs attention',
    content: 'Use this panel as the owner’s daily action list: restock risks, setup gaps, profit pressure, and next actions.',
  },
  {
    target: '[data-tour="help-box"]',
    title: 'Lexa and setup help',
    content: 'Open the help box to switch from sample data to a real business, book assisted setup, or ask Lexa for product support.',
    placement: 'left',
  },
];

export function AppTour() {
  const [run, setRun] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(TOUR_KEY)) return;
    const timer = window.setTimeout(() => setRun(true), 700);
    return () => window.clearTimeout(timer);
  }, []);

  function onCallback(data: EventData) {
    const finished = data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED;
    if (finished) {
      localStorage.setItem(TOUR_KEY, '1');
      setRun(false);
    }
  }

  return (
    <Joyride
      run={run}
      steps={steps}
      continuous
      onEvent={onCallback}
      styles={{
        overlay: { backgroundColor: 'rgba(0,0,0,0.36)', zIndex: 10000 },
        tooltip: {
          borderRadius: 0,
          border: '1px solid #e5e5e5',
          boxShadow: '0 20px 55px rgba(0,0,0,0.14)',
          color: '#171717',
        },
        buttonPrimary: {
          borderRadius: 0,
          backgroundColor: '#171717',
        },
        buttonBack: {
          color: '#525252',
        },
      }}
    />
  );
}
