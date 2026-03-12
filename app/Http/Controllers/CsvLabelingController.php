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
    const COL_EXTRACTION = 'hasil_ekstraksi_warna_hex';
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
            
            // Validation: id_baru must be 1, 7, 13, 19, ... (1 + 6k)
            if (($startId - 1) % 6 !== 0) {
                return response()->json(['error' => 'Harus mulai dari id_baru 1, 7, 13, 19, dst (Kelipatan 6 + 1)'], 400);
            }

            // Extract and Deduplicate Header
            $records = $csv->getRecords();
            $header = [];
            $items = [];
            $found = false;
            $count = 0;
            $processedCount = 0;

            foreach ($records as $offset => $row) {
                if ($offset === 0) {
                    $counts = [];
                    foreach ($row as $col) {
                        $col = trim($col);
                        if (empty($col)) $col = 'unknown'; // handle empty cols
                        if (isset($counts[$col])) {
                            $counts[$col]++;
                            $header[] = "{$col}_{$counts[$col]}";
                        } else {
                            $counts[$col] = 1;
                            $header[] = $col;
                        }
                    }
                    continue;
                }

                // Map row to header
                $record = array_combine($header, $row);
                if ($record === false) continue; // handle row/header mismatch

                $currentIdBaru = $record['id_baru'] ?? $record['id'] ?? null;
                if ($currentIdBaru == $startId || $found) {
                    $found = true;

                    // Logic: Extract first hex from hasil_ekstraksi_warna_hex
                    $record['extracted_hex'] = $this->getFirstHex($record[self::COL_EXTRACTION] ?? '');
                    $items[] = array_merge($record, ['id_baru' => $currentIdBaru]);
                    $count++;
                }
                
                $processedCount++;
                if ($count >= $stepSize)
                    break;
            }

            return response()->json([
                'data' => $items,
                'total' => $processedCount // Total processed so far or count records
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
                $row['id'] ?? '',
                $row['id_baru'] ?? '',
                $row['teori_warna'] ?? '',
                $row[self::COL_EXTRACTION] ?? '',
                $row[self::COL_COMBO] ?? '',
                $row['label_kecocokan'] ?? ''
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
