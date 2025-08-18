import type { Tournament, Session } from '@/types';

export interface ExportData {
  tournaments: Tournament[];
  sessions: Session[];
  summary: {
    totalTournaments: number;
    totalBuyins: number;
    totalPrizes: number;
    netProfit: number;
    roi: number;
    winRate: number;
  };
}

export function exportToCSV(data: ExportData): void {
  const csvContent = generateCSV(data.tournaments);
  downloadFile(csvContent, 'poker-tournaments.csv', 'text/csv');
}

export function exportToJSON(data: ExportData): void {
  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, 'poker-data.json', 'application/json');
}

function generateCSV(tournaments: Tournament[]): string {
  const headers = [
    'Date',
    'Tournament Name',
    'Site',
    'Game',
    'Speed',
    'Table Size',
    'Buy-in',
    'Prize Won',
    'Bounties Won',
    'Entries Used',
    'Rebuys',
    'Net Profit',
    'ROI %',
    'Status',
    'Duration (hours)',
    'Notes'
  ];

  const rows = tournaments.map(tournament => {
    const buyin = Number(tournament.buy_in || 0);
    const prize = Number(tournament.prize_won || 0);
    const bounties = Number(tournament.bounties_won || 0);
    const netProfit = prize + bounties - buyin;
    const roi = buyin > 0 ? ((netProfit / buyin) * 100) : 0;
    
    const startTime = new Date(tournament.start_time);
    const endTime = tournament.end_time ? new Date(tournament.end_time) : null;
    const duration = endTime ? (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60) : null;
    
    const status = tournament.end_time ? (prize > 0 ? 'Cashed' : 'Busted') : 'Active';

    return [
      startTime.toLocaleDateString(),
      `"${tournament.name}"`,
      `"${tournament.site}"`,
      tournament.game || 'NLHE',
      tournament.speed || 'regular',
      tournament.table_size || '8max',
      buyin.toFixed(2),
      prize.toFixed(2),
      bounties.toFixed(2),
      tournament.entries_used || 1,
      tournament.rebuys || 0,
      netProfit.toFixed(2),
      roi.toFixed(2),
      status,
      duration ? duration.toFixed(2) : '',
      `"${tournament.notes || ''}"`
    ];
  });

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

export function generateSessionReport(sessions: Session[]): string {
  const headers = [
    'Session ID',
    'Date',
    'Duration (hours)',
    'Tournaments Played',
    'Total Buy-ins',
    'Total Prizes',
    'Net Profit',
    'ROI %',
    'Best Tournament',
    'Worst Tournament',
    'Notes'
  ];

  const rows = sessions.map(session => {
    // Note: This would need to be enhanced with actual session data
    // For now, providing the structure
    return [
      session.id?.toString() || '',
      session.start_time ? new Date(session.start_time).toLocaleDateString() : '',
      '', // Duration calculation would go here
      '', // Tournament count would go here
      '', // Total buy-ins would go here
      '', // Total prizes would go here
      '', // Net profit would go here
      '', // ROI would go here
      '', // Best tournament would go here
      '', // Worst tournament would go here
      `"${session.notes || ''}"`
    ];
  });

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

export function exportSessionReport(sessions: Session[]): void {
  const csvContent = generateSessionReport(sessions);
  downloadFile(csvContent, 'poker-sessions.csv', 'text/csv');
}