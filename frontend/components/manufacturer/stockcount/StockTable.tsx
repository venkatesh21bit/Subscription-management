import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { StockItem } from './data';

interface StockTableProps {
  stockData: StockItem[];
}

const StockTable: React.FC<StockTableProps> = ({ stockData }) => {
  return (
    <div className="overflow-x-auto">
      <h2 className="text-lg font-semibold mb-4 text-blue-400">Stock Information</h2>

      {stockData.length > 0 ? (
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-blue-400 bg-blue-900/20">
                <th className="text-left py-3 px-4 text-blue-400">Product Name</th>
                <th className="text-left py-3 px-4 text-blue-400">Category</th>
                <th className="text-left py-3 px-4 text-blue-400">Available</th>
                <th className="text-left py-3 px-4 text-blue-400">Sold</th>
                <th className="text-left py-3 px-4 text-blue-400">Demanded</th>
                <th className="text-left py-3 px-4 text-blue-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {stockData.map((item, index) => (
                <tr key={item.productName + item.category || index} className="border-b border-blue-400/30 hover:bg-blue-900/20">
                  <td className="py-3 px-4 font-medium text-blue-200">{item.productName}</td>
                  <td className="py-3 px-4 text-blue-200">{item.category}</td>
                  <td className="py-3 px-4 text-blue-200">{item.available}</td>
                  <td className="py-3 px-4 text-blue-200">{item.sold}</td>
                  <td className="py-3 px-4 flex items-center gap-2 text-blue-200">
                    {item.demanded}
                    {item.demanded > item.available && (
                      <ArrowUpRight className="text-red-400 h-4 w-4" />
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-1 rounded text-sm ${
                        item.available > item.demanded 
                          ? "bg-blue-900 text-blue-300" 
                          : "bg-red-900 text-red-300"
                      }`}
                    >
                      {item.available > item.demanded ? "Sufficient" : "High Demand"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-400">No stock data available</p>
      )}
    </div>
  );
};

export default StockTable;