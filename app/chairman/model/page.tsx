'use client'
import { modelMetrics, modelComparisonData, cvFoldResults } from '@/lib/data'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts'

const metricsDisplay = [
  { key: 'accuracy', label: 'Accuracy', value: modelMetrics.accuracy, color: '#0B2C5D' },
  { key: 'precision', label: 'Precision', value: modelMetrics.precision, color: '#1d4ed8' },
  { key: 'recall', label: 'Recall (Sensitivity)', value: modelMetrics.recall, color: '#16a34a' },
  { key: 'specificity', label: 'Specificity', value: modelMetrics.specificity, color: '#7c3aed' },
  { key: 'f1Score', label: 'F1-Score', value: modelMetrics.f1Score, color: '#ea580c' },
  { key: 'rocAuc', label: 'ROC AUC', value: modelMetrics.rocAuc, color: '#F2B705' },
]

const radarData = metricsDisplay.map(m => ({
  metric: m.label.replace(' (Sensitivity)', ''),
  'Random Forest': parseFloat((m.value * 100).toFixed(1)),
}))

export default function ModelPage() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Model Performance</h1>
        <p className="text-gray-500 text-sm mt-1">Random Forest Classifier · SMOTE · 10-Fold Cross-Validation (10 iterations)</p>
      </div>

      {/* Performance Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {metricsDisplay.map(m => (
          <div key={m.key} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
            <div className="text-2xl font-bold" style={{ color: m.color }}>{(m.value * 100).toFixed(2)}%</div>
            <div className="text-gray-500 text-xs font-medium mt-1">{m.label}</div>
            <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
              <div className="h-1.5 rounded-full" style={{ width: `${m.value * 100}%`, backgroundColor: m.color }} />
            </div>
          </div>
        ))}
      </div>

      {/* Confusion Matrix + Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
        {/* Confusion Matrix */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-700 mb-1">Confusion Matrix</h3>
          <p className="text-gray-400 text-xs mb-5">Final holdout test set (20%)</p>
          <div className="flex flex-col items-center">
            <div className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Predicted</div>
            <div className="grid grid-cols-3 gap-1 text-sm font-medium">
              <div />
              <div className="text-center py-2 px-4 text-gray-500">PASSED</div>
              <div className="text-center py-2 px-4 text-gray-500">FAILED</div>

              <div className="flex items-center text-gray-500 text-xs pr-3 justify-end">PASSED<br/><span className="font-normal text-gray-300">(Actual)</span></div>
              <div className="text-center py-5 px-4 rounded-lg font-bold text-2xl text-white" style={{ backgroundColor: '#0B2C5D' }}>
                {modelMetrics.trueNegative}
                <div className="text-xs font-normal mt-0.5 opacity-80">TN</div>
              </div>
              <div className="text-center py-5 px-4 rounded-lg font-bold text-2xl" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>
                {modelMetrics.falseNegative}
                <div className="text-xs font-normal mt-0.5 opacity-70">FN</div>
              </div>

              <div className="flex items-center text-gray-500 text-xs pr-3 justify-end">FAILED<br/><span className="font-normal text-gray-300">(Actual)</span></div>
              <div className="text-center py-5 px-4 rounded-lg font-bold text-2xl" style={{ backgroundColor: '#fef9e7', color: '#92700a' }}>
                {modelMetrics.falsePositive}
                <div className="text-xs font-normal mt-0.5 opacity-70">FP</div>
              </div>
              <div className="text-center py-5 px-4 rounded-lg font-bold text-2xl text-white" style={{ backgroundColor: '#16a34a' }}>
                {modelMetrics.truePositive}
                <div className="text-xs font-normal mt-0.5 opacity-80">TP</div>
              </div>
            </div>
          </div>
        </div>

        {/* Radar Chart */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-700 mb-1">Performance Radar</h3>
          <p className="text-gray-400 text-xs mb-2">Random Forest metrics overview</p>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Radar name="Random Forest" dataKey="Random Forest" stroke="#0B2C5D" fill="#0B2C5D" fillOpacity={0.25} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Model Comparison */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
        <h3 className="font-semibold text-gray-700 mb-1">Model Comparison</h3>
        <p className="text-gray-400 text-xs mb-5">Baseline comparison: 5 candidate models</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Model', 'Accuracy', 'Precision', 'Recall', 'Specificity', 'F1-Score', 'ROC AUC'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-gray-500 font-semibold text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {modelComparisonData.map((m, i) => (
                <tr key={m.model} className={i === 0 ? 'font-semibold' : ''} style={i === 0 ? { backgroundColor: 'rgba(11,44,93,0.04)' } : {}}>
                  <td className="px-4 py-3 text-gray-800">
                    {m.model}
                    {i === 0 && <span className="ml-2 text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: '#F2B705', color: '#0B2C5D' }}>Best</span>}
                  </td>
                  {[m.accuracy, m.precision, m.recall, m.specificity, m.f1, m.roc].map((v, j) => (
                    <td key={j} className="px-4 py-3 text-gray-600">{(v * 100).toFixed(2)}%</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CV Fold Results */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-700 mb-1">10-Fold Cross-Validation Results</h3>
        <p className="text-gray-400 text-xs mb-5">Per-fold performance · Random Forest (best iteration)</p>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={cvFoldResults}>
            <XAxis dataKey="fold" tickFormatter={v => `Fold ${v}`} tick={{ fontSize: 11 }} />
            <YAxis domain={[0.75, 1.0]} tickFormatter={v => `${(v * 100).toFixed(0)}%`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => `${(v * 100).toFixed(2)}%`} />
            <Legend />
            <Line type="monotone" dataKey="accuracy" name="Accuracy" stroke="#0B2C5D" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="recall" name="Recall" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="f1" name="F1-Score" stroke="#ea580c" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
