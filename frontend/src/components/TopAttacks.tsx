import { ExternalLink, Award } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatters';
import type { TopAttack } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Button } from './ui/button';

interface Props {
  data: TopAttack[];
}

export const TopAttacks: React.FC<Props> = ({ data }) => {
  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-zinc-400" />
          <CardTitle>Top Attacks by Loss Amount</CardTitle>
        </div>
        <CardDescription>
          Most significant crypto protocol exploits ranked by financial impact
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Rank</TableHead>
              <TableHead>Protocol</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Loss Amount</TableHead>
              <TableHead className="text-center w-20">Link</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((attack, index) => (
              <TableRow key={`${attack.protocol_name}-${attack.attack_date}`}>
                <TableCell>
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                    index === 0 ? 'bg-zinc-200 text-zinc-900' :
                    index === 1 ? 'bg-zinc-400 text-zinc-900' :
                    index === 2 ? 'bg-zinc-600 text-zinc-50' :
                    'bg-zinc-800 text-zinc-400'
                  }`}>
                    {index + 1}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="text-zinc-50 font-semibold">
                      {attack.protocol_name}
                    </div>
                    {attack.description && (
                      <div className="text-zinc-500 text-xs line-clamp-1 max-w-md">
                        {attack.description}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-zinc-400 text-sm">
                  {formatDate(attack.attack_date)}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="capitalize">
                    {attack.attack_type}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-zinc-50 font-bold text-base">
                    {formatCurrency(attack.loss_amount_usd)}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  {attack.source_url && (
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      className="h-8 w-8"
                    >
                      <a
                        href={attack.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
