import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';

interface AttendanceExportRow {
    rollNumber: string;
    studentName: string;
    status: string;
}

export const exportService = {
    async exportAttendanceToExcel(
        subjectName: string,
        subjectCode: string,
        date: string,
        rows: AttendanceExportRow[]
    ) {
        try {
            // Build worksheet data
            const wsData = [
                [`Attendance Report - ${subjectCode}: ${subjectName}`],
                [`Date: ${date}`],
                [], // blank row
                ['Roll Number', 'Student Name', 'Status'],
                ...rows.map((r) => [r.rollNumber, r.studentName, r.status.toUpperCase()]),
                [], // blank row
                [`Total Students: ${rows.length}`],
                [`Present: ${rows.filter((r) => r.status === 'present').length}`],
                [`Absent: ${rows.filter((r) => r.status === 'absent').length}`],
                [`Late: ${rows.filter((r) => r.status === 'late').length}`],
                [`Excused: ${rows.filter((r) => r.status === 'excused').length}`],
            ];

            // Create workbook
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(wsData);

            // Set column widths
            ws['!cols'] = [
                { wch: 15 }, // Roll Number
                { wch: 25 }, // Student Name
                { wch: 12 }, // Status
            ];

            XLSX.utils.book_append_sheet(wb, ws, 'Attendance');

            // Generate binary output
            const wbout = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
            const uint8Array = new Uint8Array(wbout);

            // Write file using new expo-file-system API
            const fileName = `Attendance_${subjectCode}_${date}.xlsx`;
            const file = new File(Paths.cache, fileName);

            // Write using writable stream
            const writer = file.writableStream().getWriter();
            await writer.write(uint8Array);
            await writer.close();

            // Share file
            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
                await Sharing.shareAsync(file.uri, {
                    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    dialogTitle: `Attendance - ${subjectCode} - ${date}`,
                });
            } else {
                throw new Error('Sharing is not available on this device');
            }

            return { success: true, error: null };
        } catch (error: any) {
            console.error('Export error:', error);
            return { success: false, error: error.message };
        }
    },
};

export default exportService;
