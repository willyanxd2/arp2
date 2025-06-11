import { useState, useEffect, useCallback } from 'react';
import { Job, Device, Alert, ScanResult } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export function useArpMonitoring() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');

  // Check API connection
  const checkConnection = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (response.ok) {
        setConnectionStatus('connected');
        setError(null);
        return true;
      } else {
        throw new Error(`Server responded with status: ${response.status}`);
      }
    } catch (err) {
      console.error('API connection check failed:', err);
      setConnectionStatus('disconnected');
      setError(`Cannot connect to backend API at ${API_BASE_URL}. Please ensure the backend service is running.`);
      return false;
    }
  }, []);

  // Enhanced fetch with better error handling
  const fetchWithErrorHandling = useCallback(async (endpoint: string, options?: RequestInit) => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Endpoint not found: ${endpoint}`);
        } else if (response.status >= 500) {
          throw new Error(`Server error (${response.status}): ${response.statusText}`);
        } else {
          throw new Error(`Request failed (${response.status}): ${response.statusText}`);
        }
      }

      return await response.json();
    } catch (err) {
      if (err instanceof TypeError && err.message.includes('fetch')) {
        throw new Error(`Network error: Cannot connect to backend API at ${API_BASE_URL}`);
      }
      throw err;
    }
  }, []);

  // Fetch data from API
  const fetchJobs = useCallback(async () => {
    try {
      const data = await fetchWithErrorHandling('/jobs');
      setJobs(data);
    } catch (err) {
      console.error('Error fetching jobs:', err);
      setError(`Failed to fetch jobs: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [fetchWithErrorHandling]);

  const fetchDevices = useCallback(async () => {
    try {
      const data = await fetchWithErrorHandling('/devices');
      setDevices(data);
    } catch (err) {
      console.error('Error fetching devices:', err);
      setError(`Failed to fetch devices: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [fetchWithErrorHandling]);

  const fetchAlerts = useCallback(async () => {
    try {
      const data = await fetchWithErrorHandling('/alerts');
      setAlerts(data);
    } catch (err) {
      console.error('Error fetching alerts:', err);
      setError(`Failed to fetch alerts: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [fetchWithErrorHandling]);

  const fetchScanResults = useCallback(async () => {
    try {
      const data = await fetchWithErrorHandling('/scans');
      setScanResults(data);
    } catch (err) {
      console.error('Error fetching scan results:', err);
      setError(`Failed to fetch scan results: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [fetchWithErrorHandling]);

  // Initial data load with connection check
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setConnectionStatus('checking');
      
      const isConnected = await checkConnection();
      
      if (isConnected) {
        await Promise.all([
          fetchJobs(),
          fetchDevices(),
          fetchAlerts(),
          fetchScanResults()
        ]);
      }
      
      setLoading(false);
    };

    loadData();
  }, [checkConnection, fetchJobs, fetchDevices, fetchAlerts, fetchScanResults]);

  // Polling for real-time updates (only when connected)
  useEffect(() => {
    if (connectionStatus !== 'connected') {
      return;
    }

    const interval = setInterval(async () => {
      const isConnected = await checkConnection();
      if (isConnected) {
        fetchDevices();
        fetchAlerts();
        fetchScanResults();
      }
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, [connectionStatus, checkConnection, fetchDevices, fetchAlerts, fetchScanResults]);

  // Execute scan
  const executeScan = useCallback(async (job: Job): Promise<ScanResult> => {
    setIsScanning(true);
    try {
      const response = await fetch(`${API_BASE_URL}/jobs/${job.id}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to execute scan: ${response.statusText}`);
      }

      // Refresh data after scan
      await Promise.all([
        fetchDevices(),
        fetchAlerts(),
        fetchScanResults()
      ]);

      // Return a mock result for now - in real implementation, 
      // the API would return the actual scan result
      const result: ScanResult = {
        id: crypto.randomUUID(),
        jobId: job.id,
        timestamp: new Date(),
        devicesFound: 0,
        newDevices: 0,
        alerts: [],
        executionTime: 0,
        status: 'success'
      };

      return result;
    } catch (err) {
      console.error('Error executing scan:', err);
      throw new Error(`Scan execution failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsScanning(false);
    }
  }, [fetchDevices, fetchAlerts, fetchScanResults]);

  // Create job
  const createJob = useCallback(async (jobData: Omit<Job, 'id' | 'createdAt'>) => {
    try {
      const data = await fetchWithErrorHandling('/jobs', {
        method: 'POST',
        body: JSON.stringify(jobData),
      });

      await fetchJobs();
      return data;
    } catch (err) {
      console.error('Error creating job:', err);
      throw new Error(`Failed to create job: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [fetchWithErrorHandling, fetchJobs]);

  // Update job
  const updateJob = useCallback(async (id: string, updates: Partial<Job>) => {
    try {
      await fetchWithErrorHandling(`/jobs/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      await fetchJobs();
    } catch (err) {
      console.error('Error updating job:', err);
      throw new Error(`Failed to update job: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [fetchWithErrorHandling, fetchJobs]);

  // Delete job
  const deleteJob = useCallback(async (id: string) => {
    try {
      await fetchWithErrorHandling(`/jobs/${id}`, {
        method: 'DELETE',
      });

      await fetchJobs();
    } catch (err) {
      console.error('Error deleting job:', err);
      throw new Error(`Failed to delete job: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [fetchWithErrorHandling, fetchJobs]);

  // Acknowledge alert
  const acknowledgeAlert = useCallback(async (id: string) => {
    try {
      await fetchWithErrorHandling(`/alerts/${id}/acknowledge`, {
        method: 'PATCH',
      });

      await fetchAlerts();
    } catch (err) {
      console.error('Error acknowledging alert:', err);
      throw new Error(`Failed to acknowledge alert: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [fetchWithErrorHandling, fetchAlerts]);

  // Clear alerts
  const clearAlerts = useCallback(async () => {
    try {
      await fetchWithErrorHandling('/alerts', {
        method: 'DELETE',
      });

      await fetchAlerts();
    } catch (err) {
      console.error('Error clearing alerts:', err);
      throw new Error(`Failed to clear alerts: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [fetchWithErrorHandling, fetchAlerts]);

  // Retry connection
  const retryConnection = useCallback(async () => {
    setError(null);
    setConnectionStatus('checking');
    const isConnected = await checkConnection();
    
    if (isConnected) {
      await Promise.all([
        fetchJobs(),
        fetchDevices(),
        fetchAlerts(),
        fetchScanResults()
      ]);
    }
  }, [checkConnection, fetchJobs, fetchDevices, fetchAlerts, fetchScanResults]);

  return {
    jobs,
    devices,
    alerts,
    scanResults,
    isScanning,
    loading,
    error,
    connectionStatus,
    executeScan,
    createJob,
    updateJob,
    deleteJob,
    acknowledgeAlert,
    clearAlerts,
    retryConnection,
    refreshData: () => {
      fetchJobs();
      fetchDevices();
      fetchAlerts();
      fetchScanResults();
    }
  };
}