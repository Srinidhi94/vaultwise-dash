import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrendingDown, TrendingUp } from "lucide-react";

interface CategoryData {
  name: string;
  amount: number;
  color?: string;
}

interface CategoryChartsProps {
  expenseData: CategoryData[];
  incomeData: CategoryData[];
  currencySymbol: string;
}

export const CategoryCharts = ({
  expenseData,
  incomeData,
  currencySymbol,
}: CategoryChartsProps) => {
  const formatCurrency = (value: number) => {
    return `${currencySymbol}${value.toFixed(0)}`;
  };

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: CategoryData; value: number }> }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3">
          <p className="font-semibold text-sm">{payload[0].payload.name}</p>
          <p className="text-primary font-bold">
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  const renderChart = (data: CategoryData[], title: string, icon: React.ElementType, color: string) => {
    const Icon = icon;
    const hasData = data.length > 0 && data.some(d => d.amount > 0);

    return (
      <Card className="financial-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Icon className={`h-5 w-5 ${color}`} />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasData ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 12 }}
                  interval={0}
                />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={formatCurrency} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={color === "text-destructive" ? "hsl(var(--destructive))" : "hsl(var(--success))"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Icon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No data for selected period</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {renderChart(expenseData, "Spends by Category", TrendingDown, "text-destructive")}
      {renderChart(incomeData, "Income by Category", TrendingUp, "text-success")}
    </div>
  );
};
