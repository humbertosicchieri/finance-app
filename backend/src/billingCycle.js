function getBillingCycle(closingDay, referenceDate) {
  const ref = new Date(referenceDate || Date.now());
  const year = ref.getFullYear();
  const month = ref.getMonth();

  const closeThisMonth = new Date(year, month, closingDay);

  let cycleStart, cycleEnd, labelMonth;

  if (ref.getDate() > closingDay) {
    cycleStart = closeThisMonth;
    cycleEnd = new Date(year, month + 1, closingDay);
    labelMonth = month + 1;
  } else {
    cycleStart = new Date(year, month - 1, closingDay);
    cycleEnd = closeThisMonth;
    labelMonth = month;
  }

  const nextDay = new Date(cycleEnd);
  nextDay.setDate(nextDay.getDate() + 1);

  const startStr = cycleStart.toISOString().split('T')[0];
  const endStr = cycleEnd.toISOString().split('T')[0];
  const nextStartStr = nextDay.toISOString().split('T')[0];

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  return {
    cycleStart: startStr,
    cycleEnd: endStr,
    cycleLabel: `${monthNames[labelMonth % 12]} ${cycleEnd.getFullYear()}`,
    cycleEndDate: endStr,
    nextCycleStart: nextStartStr,
    referenceMonth: labelMonth,
    referenceYear: cycleEnd.getFullYear(),
  };
}

function getBillingCycleForDate(closingDay, dateStr) {
  const date = new Date(dateStr + 'T12:00:00');
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  let cycleEnd, cycleLabel, cycleStart;

  if (day <= closingDay) {
    cycleEnd = new Date(year, month, closingDay);
    cycleStart = new Date(year, month - 1, closingDay + 1);
    cycleLabel = `${['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][month]} ${year}`;
  } else {
    cycleEnd = new Date(year, month + 1, closingDay);
    cycleStart = new Date(year, month, closingDay + 1);
    cycleLabel = `${['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][(month + 1) % 12]} ${cycleEnd.getFullYear()}`;
  }

  return {
    cycleStart: cycleStart.toISOString().split('T')[0],
    cycleEnd: cycleEnd.toISOString().split('T')[0],
    cycleLabel,
  };
}

module.exports = { getBillingCycle, getBillingCycleForDate };
