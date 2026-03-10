<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use League\Csv\Reader;
use League\Csv\Writer;
use Illuminate\Support\Facades\Response;

class CsvLabelingController extends Controller
{
    protected $csvPath = 'datasets/dataset.csv';

    // Penyesuaian nama kolom sesuai dataset.csv (Verified via view_file)
    const COL_EXTRACTION = 'hasil_ektraksi_warna';
    const COL_COMBO = 'warna_kombinasi';

    public function index()
    {
        return inertia('Welcome');
    }

    public function getData(Request $request)
    {
        $startId = $request->query('start_id', 1);
        $stepSize = 6;

        if (!Storage::exists($this->csvPath)) {
            return response()->json(['error' => 'Dataset not found'], 404);
        }

        try {
            $content = Storage::get($this->csvPath);
            $csv = Reader::createFromString($content);
            $csv->setHeaderOffset(0);

            // Validation: id_baru must be 1, 7, 13, 19, ... (1 + 6k)
            if (($startId - 1) % 6 !== 0) {
                return response()->json(['error' => 'Harus mulai dari id_baru 1, 7, 13, 19, dst (Kelipatan 6 + 1)'], 400);
            }

            // Find the index of the start_id
            $records = $csv->getRecords();
            $items = [];
            $found = false;
            $count = 0;

            foreach ($records as $offset => $record) {
                $currentIdBaru = $record['id_baru'] ?? $record['id'];
                if ($currentIdBaru == $startId || $found) {
                    $found = true;

                    // Logic: Extract first hex from hasil_ektraksi_warna
                    $record['extracted_hex'] = $this->getFirstHex($record[self::COL_EXTRACTION]);
                    $items[] = array_merge($record, ['id_baru' => $currentIdBaru]);
                    $count++;
                }
                if ($count >= $stepSize)
                    break;
            }

            return response()->json([
                'data' => $items,
                'total' => $csv->count()
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    protected function getFirstHex($val)
    {
        if (empty($val))
            return null;
        if (preg_match('/#[0-9A-Fa-f]{6}/', $val, $matches)) {
            return $matches[0];
        }
        return null;
    }

    public function download(Request $request)
    {
        $results = $request->input('results');
        if (!$results && $request->has('results_json')) {
            $results = json_decode($request->input('results_json'), true);
        }

        if (empty($results)) {
            return response()->json(['error' => 'No data to export'], 400);
        }

        $idAwal = $results[0]['id_baru'] ?? 'start';
        $idAkhir = end($results)['id_baru'] ?? 'end';
        $filename = "hasil_label_id_baru_{$idAwal}-{$idAkhir}.csv";

        $csv = Writer::createFromString('');
        $csv->insertOne(['id', 'id_baru', 'teori_warna', self::COL_EXTRACTION, self::COL_COMBO, 'label_kecocokan']);

        foreach ($results as $row) {
            $csv->insertOne([
                $row['id'],
                $row['id_baru'],
                $row['teori_warna'],
                $row['hasil_ektraksi_warna'], // tetap dikirim frontend sebagai key ini
                $row['warna_kombinasi'],      // tetap dikirim frontend sebagai key ini
                $row['label_kecocokan']
            ]);
        }
        $content = (string) $csv;

        return response($content, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            'Content-Length' => strlen($content),
            'Pragma' => 'no-cache',
            'Expires' => '0'
        ]);
    }
}
