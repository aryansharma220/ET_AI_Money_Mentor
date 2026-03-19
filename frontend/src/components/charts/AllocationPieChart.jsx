import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#f4f8ff", "#6bd7cb", "#8db5df"];

export default function AllocationPieChart({ allocation }) {
  const data = [
    { name: "Equity", value: allocation.equity },
    { name: "Debt", value: allocation.debt },
    { name: "Liquid", value: allocation.liquid },
  ];

  return (
    <div className="workspace-side-panel workspace-tone-graphite chart-dark h-80">
      <h3 className="mb-3 text-lg font-bold text-white">Asset Allocation</h3>
      <ResponsiveContainer width="100%" height="85%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" outerRadius={95}>
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: "#eaf3ff", border: "1px solid rgba(18,48,79,0.25)", borderRadius: "10px", color: "#102845" }}
            labelStyle={{ color: "#102845", fontWeight: 700 }}
            itemStyle={{ color: "#102845", fontWeight: 700 }}
          />
          <Legend
            wrapperStyle={{ color: "#eef5ff", fontSize: "14px", fontWeight: 600 }}
            iconType="circle"
            formatter={(value) => <span style={{ color: "#eef5ff" }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
