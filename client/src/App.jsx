import React, { useState } from 'react';
import HomographyCalibrator from './components/HomographyCalibrator';

export default function App() {
  // Sample placeholder image for testing homography calibration
  const sampleImage = 'https://picsum.photos/id/1074/1280/720';
  const [calibrationData, setCalibrationData] = useState(null);

  const handleSaveCalibration = (data) => {
    console.log('Saved Calibration Data:', data);
    setCalibrationData(data);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 flex flex-col items-center justify-start gap-8">
      <header className="text-center max-w-xl">
        <h1 className="text-3xl font-extrabold tracking-tight mb-2">HeatVision Dashboard</h1>
        <p className="text-sm text-slate-400">
          Interactive calibration tool to warp camera perspective coordinates onto store blueprint floor plans.
        </p>
      </header>

      <main className="w-full max-w-5xl">
        <HomographyCalibrator
          imageSrc={sampleImage}
          onSaveCalibration={handleSaveCalibration}
        />

        {calibrationData && (
          <div className="mt-6 p-4 bg-slate-900 border border-slate-800 rounded-xl max-w-5xl mx-auto">
            <h3 className="text-sm font-semibold text-emerald-400 mb-2">
              ✓ Calibration Output Captured
            </h3>
            <pre className="bg-slate-950 p-3 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto">
              {JSON.stringify(calibrationData, null, 2)}
            </pre>
          </div>
        )}
      </main>
    </div>
  );
}