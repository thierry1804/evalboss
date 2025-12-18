import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts';

interface RadarData {
  subject: string;
  value: number;
  fullMark?: number;
}

interface RadarChartComponentProps {
  data: RadarData[];
  dataKey?: string;
  title?: string;
  maxValue?: number;
  color?: string;
  secondData?: RadarData[];
  secondDataKey?: string;
  secondColor?: string;
}

export function RadarChartComponent({
  data,
  dataKey = 'value',
  title,
  maxValue = 100,
  color = '#2563eb',
  secondData,
  secondDataKey = 'value2',
  secondColor = '#8b5cf6',
}: RadarChartComponentProps) {
  // Combiner les données si nécessaire pour comparaison
  const chartData = secondData
    ? data.map((item, index) => ({
        ...item,
        [dataKey]: item.value,
        [secondDataKey]: secondData[index]?.value || 0,
      }))
    : data;

  return (
    <div className="w-full">
      {title && <h3 className="text-lg font-semibold mb-4 text-center">{title}</h3>}
      <ResponsiveContainer width="100%" height={400}>
        <RadarChart data={chartData}>
          <PolarGrid />
          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
          <PolarRadiusAxis angle={90} domain={[0, maxValue]} />
          <Radar
            name="Auto-évaluation"
            dataKey={dataKey}
            stroke={color}
            fill={color}
            fillOpacity={0.6}
          />
          {secondData && (
            <Radar
              name="Manager"
              dataKey={secondDataKey}
              stroke={secondColor}
              fill={secondColor}
              fillOpacity={0.6}
            />
          )}
          <Legend />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

