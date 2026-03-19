import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function mergeSeries(baseSeries, scenarioSeries) {
  const rowMap = new Map();

  baseSeries.forEach((point) => {
    rowMap.set(point.year, {
      year: point.year,
      invested_amount: point.invested_amount,
      projected_value: point.projected_value,
      scenario_projected_value: null,
    });
  });

  (scenarioSeries || []).forEach((point) => {
    const existing = rowMap.get(point.year) || {
      year: point.year,
      invested_amount: null,
      projected_value: null,
      scenario_projected_value: null,
    };
    existing.scenario_projected_value = point.projected_value;
    rowMap.set(point.year, existing);
  });

  return [...rowMap.values()].sort((a, b) => a.year - b.year);
}

export default function GrowthChart({ data, scenarioData }) {
  const chartData = mergeSeries(data, scenarioData);

  return (
    <div className="workspace-side-panel workspace-tone-graphite chart-dark h-80">
      <h3 className="mb-3 text-lg font-bold text-white">Investment Growth Projection</h3>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="4 4" stroke="rgba(220, 235, 255, 0.22)" />
          <XAxis dataKey="year" tick={{ fill: "#d4e5f9", fontSize: 12 }} />
          <YAxis tick={{ fill: "#d4e5f9", fontSize: 12 }} />
          <Tooltip
            contentStyle={{ background: "#eaf3ff", border: "1px solid rgba(18,48,79,0.25)", borderRadius: "10px", color: "#102845" }}
            labelStyle={{ color: "#102845", fontWeight: 700 }}
            itemStyle={{ color: "#102845", fontWeight: 700 }}
          />
          <Legend wrapperStyle={{ color: "#e8f2ff" }} />
          <Line name="Invested" type="monotone" dataKey="invested_amount" stroke="#60d2c6" strokeWidth={3} dot={false} />
          <Line name="Baseline" type="monotone" dataKey="projected_value" stroke="#f6f9ff" strokeWidth={3} dot={false} />
          <Line
            name="What-if"
            type="monotone"
            dataKey="scenario_projected_value"
            stroke="#ff9b7a"
            strokeWidth={3}
            dot={false}
            strokeDasharray="6 4"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
