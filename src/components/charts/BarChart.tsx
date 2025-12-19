import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface BarData {
  name: string;
  value: number;
  value2?: number;
}

interface BarChartComponentProps {
  data: BarData[];
  title?: string;
  dataKey?: string;
  color?: string;
  secondDataKey?: string;
  secondColor?: string;
  maxValue?: number;
}

export function BarChartComponent({
  data,
  title,
  dataKey = 'value',
  color = '#2563eb',
  secondDataKey,
  secondColor = '#8b5cf6',
  maxValue,
}: BarChartComponentProps) {
  return (
    <div className="w-full">
      {title && <h3 className="text-lg font-semibold mb-4 text-center">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        <RechartsBarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis domain={maxValue ? [0, maxValue] : [0, 100]} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Bar dataKey={dataKey} fill={color} name="Auto-évaluation" />
          {secondDataKey && <Bar dataKey={secondDataKey} fill={secondColor} name="Manager" />}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}

