import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Play, Square, Terminal, Settings, Activity, Link, Unlink } from 'lucide-react';
import { format } from 'date-fns';

const MODES = [
  { id: '0', name: '0 - Normal packet' },
  { id: '1', name: '1 - NIC packet format' },
  { id: '4', name: '4 - BSNL portal packet format' },
  { id: '6', name: '6 - ARAI packet format' },
  { id: '7', name: '7 - Gujrat packet format' },
  { id: '8', name: '8 - Andaman/NIC alternate packet format' },
  { id: '9', name: '9 - FCI packet format (NIC)' },
  { id: '10', name: '10 - Maharashtra packet format' },
  { id: '11', name: '11 - Odisha packet format BSNL' },
  { id: '12', name: '12 - Maharashtra alternate packet format' },
  { id: '14', name: '14 - UP Mining Format' },
  { id: '15', name: '15 - Rajisthan mining format' },
];

const DEFAULT_TEMPLATES: Record<string, string> = {
  '0': '$NRM,{VENDOR_ID},{SW_VER},NR,01,L,{IMEI},{VEHICLE_NO},1,{DATE},{TIME},{LAT},N,{LNG},E,0.0,247.33,42,206.0,0.70,0.40,airtel,0,1,28.0,5.6,0,C,22,404,10,006F,D883,14,006F,D882,14,006F,D884,14,006F,7DE3,08,006F,7DE4,0100,00,3979,3988,{FRAME_NO},9279.671,-,-,-,-,1_1_3_5_0,C074B8C9*',
  '1': '$PVT,{VENDOR_ID},{SW_VER},NR,01,L,{IMEI},{VEHICLE_NO},1,{DATE},{TIME},{LAT},N,{LNG},E,0.00,0.0,15,541.73,0.8,0.8,CELLONE,1,1,11.5,4.3,0,C,26,404,73,0a83,e3c8,e3c7,0a83,7,e3fb,0a83,7,c79d,0a83,10,e3f9,0a83,0,0001,00,{FRAME_NO},E3*',
  '4': '$PVT,{VENDOR_ID},{SW_VER},NR,2,L,{IMEI},{VEHICLE_NO},1,{DATE},{TIME},{LAT},N,{LNG},E,000.00,0.0,12,340.02,1.4,0.0,Idea Cellular Ltd,0,1,24.8,4.2,0,C,23,404,56,1af,4b98,1af,f246,-74,f247,3,-88,0,0,,0,0,,0000,00,{FRAME_NO},DDE3220E*',
  '6': '$,NRM,{VENDOR_ID},{SW_VER},NR,01,L,{IMEI},{VEHICLE_NO},1,{DATE},{TIME},{LAT},N,{LNG},E,0.0,108.82,34,700.5,0.80,0.40,INDairtel,1,1,15.0,4.1,0,C,20,404,90,17F6,5A65,31,17F6,5A1F,31,17F6,5A01,31,17F6,5A02,31,17F6,5A66,0010,00,{FRAME_NO},00000062,*',
  '7': '$Header,{VENDOR_ID},{SW_VER},NR,1,L,{IMEI},{VEHICLE_NO},1,{DATE},{TIME},{LAT},N,{LNG},E,0.0,181.0,7,879.0,2.90,2.09,BSNL,0,1,23.0,3.9,1,C,14,404,71,ccc7,2ee0,37,2ee0,ccc6,33,3a98,f24f,32,3a98,f26d,30,3a98,f2a9,0000,01,{FRAME_NO},0.018,0.043,0.000000,()*04\\r\\n',
  '8': '$PVT,{VENDOR_ID},{SW_VER},NR,01,L,{IMEI},{VEHICLE_NO},1,{DATE},{TIME},{LAT},N,{LNG},E,0.00,0.0,15,541.73,0.8,0.8,CELLONE,1,1,11.5,4.3,0,C,26,404,73,0a83,e3c8,e3c7,0a83,7,e3fb,0a83,7,c79d,0a83,10,e3f9,0a83,0,0001,00,{FRAME_NO},E3*',
  '9': '$PVT,{VENDOR_ID},{SW_VER},NR,01,L,{IMEI},{VEHICLE_NO},1,{DATE},{TIME},{LAT},N,{LNG},E,0.00,0.0,15,541.73,0.8,0.8,CELLONE,1,1,11.5,4.3,0,C,26,404,73,0a83,e3c8,e3c7,0a83,7,e3fb,0a83,7,c79d,0a83,10,e3f9,0a83,0,0001,00,{FRAME_NO},E3*',
  '10': '$NMP,{VENDOR_ID},{SW_VER},NR,01,L,{IMEI},{VEHICLE_NO},1,{DATE},{TIME},{LAT},N,{LNG},E,000.0,359.46,45,7.7,0.8,0.4,airtel,1,1,12.9,4.2,0,C,27,404,92,07EA,9782,00,0000,0000,00,0000,0000,00,0000,0000,00,0000,0000,0000,00,{FRAME_NO},00.6,00.6,0.000,(0,0,0)*3F',
  '11': '$PVT,{VENDOR_ID},{SW_VER},NR,2,L,{IMEI},{VEHICLE_NO},1,{DATE},{TIME},{LAT},N,{LNG},E,000.00,0.0,12,340.02,1.4,0.0,Idea Cellular Ltd,0,1,24.8,4.2,0,C,23,404,56,1af,4b98,1af,f246,-74,f247,3,-88,0,0,,0,0,,0000,00,{FRAME_NO},DDE3220E*',
  '12': '$NMP,{VENDOR_ID},{SW_VER},NR,01,L,{IMEI},{VEHICLE_NO},1,{DATE},{TIME},{LAT},N,{LNG},E,000.0,359.46,45,7.7,0.8,0.4,airtel,1,1,12.9,4.2,0,C,27,404,92,07EA,9782,00,0000,0000,00,0000,0000,00,0000,0000,00,0000,0000,0000,00,{FRAME_NO},00.6,00.6,0.000,(0,0,0)*3F',
  '14': '$DP,{VENDOR_ID},{SW_VER},NR,1,L,{IMEI},{VEHICLE_NO},1,{DATE},{TIME},{LAT},N,{LNG},E,0.0,37.4,4,746.7,2.0,1.8,Airtel,0,1,12.6,3.9,0,C,29,404,03,11A,5980,11A,5D86,12,11A,597F,12,11A,53EA,10,11A,5D87,10,0000,00,2,0.8,0,0,7,(),38C90793*',
  '15': '$1,{VENDOR_ID},{SW_VER},NR,1,L,{IMEI},{VEHICLE_NO},1,{DATE},{TIME},{LAT},N,{LNG},E,0.23,192.29,19,591.70,1.14,0.80,BSNL3G,1,1,23.98,3.94,0,C,22,404,66,23B7,1FA0457,10782|-614|162 10782|-614|162 10782|-614|162 10782|-614|162,0000,00,{FRAME_NO},14150,*',
};

interface LogEntry {
  time: string;
  type: 'info' | 'success' | 'error' | 'sent' | 'received';
  message: string;
}

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [isTcpConnected, setIsTcpConnected] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Form State
  const [ip, setIp] = useState('');
  const [port, setPort] = useState('');
  const [mode, setMode] = useState('0');
  const [imei, setImei] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [swVer, setSwVer] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  
  const [locationTemplate, setLocationTemplate] = useState(DEFAULT_TEMPLATES['0']);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsWsConnected(true);
      addLog('info', 'WebSocket connected to server.');
    });

    newSocket.on('disconnect', () => {
      setIsWsConnected(false);
      setIsTcpConnected(false);
      setIsRunning(false);
      addLog('error', 'WebSocket disconnected from server.');
    });

    newSocket.on('log', (data: { type: LogEntry['type']; message: string }) => {
      addLog(data.type, data.message);
    });

    newSocket.on('tcp_connected', () => {
      setIsTcpConnected(true);
    });

    newSocket.on('tcp_disconnected', () => {
      setIsTcpConnected(false);
      setIsRunning(false);
    });

    newSocket.on('sending_started', () => {
      setIsRunning(true);
    });

    newSocket.on('sending_stopped', () => {
      setIsRunning(false);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMode = e.target.value;
    setMode(newMode);
    setLocationTemplate(DEFAULT_TEMPLATES[newMode] || '');
  };

  const addLog = (type: LogEntry['type'], message: string) => {
    setLogs((prev) => [...prev, { time: new Date().toLocaleTimeString(), type, message }]);
  };

  const clearLogs = () => setLogs([]);

  const handleConnectTcp = () => {
    if (!socket || !ip || !port) return;
    socket.emit('connect_tcp', { ip, port: parseInt(port, 10) });
  };

  const handleDisconnectTcp = () => {
    if (!socket) return;
    socket.emit('disconnect_tcp');
  };

  const handleStartSending = () => {
    if (!socket) return;
    
    if (!/^\d{15}$/.test(imei)) {
      addLog('error', 'IMEI must be exactly 15 digits.');
      return;
    }

    // Replace static variables in templates, leave {DATE}, {TIME}, {FRAME_NO} for server
    const replaceStaticVars = (template: string) => {
      return template
        .replace(/{IMEI}/g, imei)
        .replace(/{VENDOR_ID}/g, vendorId)
        .replace(/{SW_VER}/g, swVer)
        .replace(/{VEHICLE_NO}/g, vehicleNo)
        .replace(/{LAT}/g, lat)
        .replace(/{LNG}/g, lng);
    };

    const finalLocationTemplate = replaceStaticVars(locationTemplate);

    socket.emit('start_sending', {
      locationPacketTemplate: finalLocationTemplate,
    });
  };

  const handleStopSending = () => {
    if (!socket) return;
    socket.emit('stop_sending');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-gray-900">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">TCP Client Dashboard</h1>
              <p className="text-sm text-gray-500">Send AIS140/GPS packets to any IP/Port</p>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isWsConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span className="text-sm font-medium text-gray-600">
                Dashboard: {isWsConnected ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="relative flex h-3 w-3">
                {isTcpConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
                <span className={`relative inline-flex rounded-full h-3 w-3 ${isTcpConnected ? 'bg-green-500' : 'bg-gray-400'}`}></span>
              </span>
              <span className="text-sm font-medium text-gray-600">
                TCP Server: {isTcpConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Configuration Panel */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <Settings className="w-5 h-5 text-gray-500" />
                <h2 className="text-lg font-semibold">Connection Settings</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Target IP</label>
                  <input
                    type="text"
                    value={ip}
                    onChange={(e) => setIp(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="127.0.0.1"
                    disabled={isTcpConnected}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Port</label>
                  <input
                    type="text"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="8080"
                    disabled={isTcpConnected}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Packet Mode</label>
                <select
                  value={mode}
                  onChange={handleModeChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white"
                  disabled={isRunning}
                >
                  {MODES.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
              <h2 className="text-lg font-semibold mb-4">Device Parameters</h2>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">IMEI</label>
                  <input
                    type="text"
                    value={imei}
                    maxLength={15}
                    onChange={(e) => setImei(e.target.value.replace(/\D/g, ''))}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                      imei.length > 0 && imei.length !== 15 ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isRunning}
                    placeholder="15-digit IMEI"
                  />
                  {imei.length > 0 && imei.length !== 15 && (
                    <p className="text-xs text-red-500">IMEI must be exactly 15 digits</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Vendor ID</label>
                    <input
                      type="text"
                      value={vendorId}
                      onChange={(e) => setVendorId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      disabled={isRunning}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">SW Version</label>
                    <input
                      type="text"
                      value={swVer}
                      onChange={(e) => setSwVer(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      disabled={isRunning}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Vehicle Number</label>
                  <input
                    type="text"
                    value={vehicleNo}
                    onChange={(e) => setVehicleNo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    disabled={isRunning}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Latitude</label>
                    <input
                      type="text"
                      value={lat}
                      onChange={(e) => setLat(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      disabled={isRunning}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Longitude</label>
                    <input
                      type="text"
                      value={lng}
                      onChange={(e) => setLng(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      disabled={isRunning}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Templates & Terminal */}
          <div className="lg:col-span-8 space-y-6 flex flex-col">
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
              <h2 className="text-lg font-semibold">Packet Templates</h2>
              <p className="text-xs text-gray-500 mb-2">
                Available variables: {'{IMEI}'}, {'{VENDOR_ID}'}, {'{SW_VER}'}, {'{VEHICLE_NO}'}, {'{LAT}'}, {'{LNG}'}, {'{DATE}'}, {'{TIME}'}, {'{FRAME_NO}'}
              </p>
              
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Location Packet Template (Sent every 10s)</label>
                  <textarea
                    value={locationTemplate}
                    onChange={(e) => setLocationTemplate(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono text-xs"
                    disabled={isRunning}
                  />
                </div>
              </div>

              <div className="pt-4 flex space-x-4">
                {!isTcpConnected ? (
                  <button
                    onClick={handleConnectTcp}
                    disabled={!isWsConnected}
                    className="flex-1 flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    <Link className="w-4 h-4 mr-2" />
                    Connect Server
                  </button>
                ) : (
                  <button
                    onClick={handleDisconnectTcp}
                    className="flex-1 flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700 transition-colors"
                  >
                    <Unlink className="w-4 h-4 mr-2" />
                    Disconnect Server
                  </button>
                )}

                {!isRunning ? (
                  <button
                    onClick={handleStartSending}
                    disabled={!isTcpConnected}
                    className="flex-1 flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start Sending
                  </button>
                ) : (
                  <button
                    onClick={handleStopSending}
                    className="flex-1 flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 transition-colors"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Stop Sending
                  </button>
                )}
              </div>
            </div>

            <div className="bg-gray-900 rounded-xl shadow-sm border border-gray-800 flex-1 flex flex-col overflow-hidden min-h-[400px]">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900/50">
                <div className="flex items-center space-x-2 text-gray-400">
                  <Terminal className="w-4 h-4" />
                  <span className="text-sm font-medium">Terminal Logs</span>
                </div>
                <button
                  onClick={clearLogs}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Clear
                </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1 font-mono text-xs space-y-1.5">
                {logs.length === 0 ? (
                  <div className="text-gray-600 italic">No logs yet. Start the client to see activity.</div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="flex space-x-3">
                      <span className="text-gray-500 shrink-0">[{log.time}]</span>
                      <span className={`
                        ${log.type === 'info' ? 'text-blue-400' : ''}
                        ${log.type === 'success' ? 'text-green-400' : ''}
                        ${log.type === 'error' ? 'text-red-400' : ''}
                        ${log.type === 'sent' ? 'text-cyan-400' : ''}
                        ${log.type === 'received' ? 'text-purple-400' : ''}
                        break-all
                      `}>
                        {log.type === 'sent' && '→ '}
                        {log.type === 'received' && '← '}
                        {log.message}
                      </span>
                    </div>
                  ))
                )}
                <div ref={logsEndRef} />
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

