import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';

const DashboardCard = ({ title, value, icon: Icon, color = 'primary', subtitle }) => {
  const colorClasses = {
    primary: 'text-green-500 bg-green-100',
    secondary: 'text-blue-500 bg-blue-100',
    accent: 'text-green-600 bg-green-100',
    warning: 'text-status-maintenance bg-yellow-100',
  };

  // Formatar números grandes
  const formatValue = (val) => {
    if (typeof val === 'number') {
      return val.toLocaleString('pt-BR');
    }
    return val;
  };

  return (
    <Card className="bg-gradient-card shadow-card hover:shadow-hover transition-shadow duration-200 h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-full ${colorClasses[color].split(' ')[1]}`}>
          <Icon className={`h-5 w-5 ${colorClasses[color].split(' ')[0]}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground mb-1">
          {formatValue(value)}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground">
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default DashboardCard;
