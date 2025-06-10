// Enhanced Chart Components for Admin Dashboard
// Using Chart.js for data visualizations

class DashboardCharts {
    constructor() {
        this.charts = {};
        this.colors = {
            primary: '#667eea',
            secondary: '#764ba2',
            success: '#28a745',
            warning: '#ffc107',
            danger: '#dc3545',
            info: '#17a2b8',
            light: '#f8f9fa',
            dark: '#343a40'
        };
    }

    // Initialize all charts
    async initializeCharts() {
        await this.createDailyActiveVehiclesChart();
        await this.createVehicleTypeDistributionChart();
        await this.createWeeklyAlertsChart();
        await this.createSpeedAnalysisChart();
        await this.createRouteAnalysisChart();
    }

    // Line chart for daily active vehicle count
    async createDailyActiveVehiclesChart() {
        const ctx = document.getElementById('dailyActiveVehiclesChart');
        if (!ctx) return;

        try {
            const data = await this.getDailyActiveVehiclesData();
            
            this.charts.dailyActiveVehicles = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.labels,
                    datasets: [{
                        label: 'Active Vehicles',
                        data: data.values,
                        borderColor: this.colors.primary,
                        backgroundColor: this.hexToRgba(this.colors.primary, 0.1),
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: this.colors.primary,
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Daily Active Vehicle Count',
                            font: {
                                size: 16,
                                weight: 'bold'
                            },
                            color: this.colors.dark
                        },
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: this.hexToRgba(this.colors.dark, 0.1)
                            },
                            ticks: {
                                color: this.colors.dark
                            }
                        },
                        x: {
                            grid: {
                                color: this.hexToRgba(this.colors.dark, 0.1)
                            },
                            ticks: {
                                color: this.colors.dark
                            }
                        }
                    },
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    }
                }
            });
        } catch (error) {
            console.error('Error creating daily active vehicles chart:', error);
        }
    }

    // Pie chart for vehicle type distribution
    async createVehicleTypeDistributionChart() {
        const ctx = document.getElementById('vehicleTypeChart');
        if (!ctx) return;

        try {
            const data = await this.getVehicleTypeDistributionData();
            
            this.charts.vehicleTypeDistribution = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: data.labels,
                    datasets: [{
                        data: data.values,
                        backgroundColor: [
                            this.colors.primary,
                            this.colors.secondary,
                            this.colors.success,
                            this.colors.warning,
                            this.colors.info
                        ],
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Vehicle Type Distribution',
                            font: {
                                size: 16,
                                weight: 'bold'
                            },
                            color: this.colors.dark
                        },
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 20,
                                usePointStyle: true,
                                color: this.colors.dark
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error creating vehicle type distribution chart:', error);
        }
    }

    // Bar chart for weekly alerts/feedback volume
    async createWeeklyAlertsChart() {
        const ctx = document.getElementById('weeklyAlertsChart');
        if (!ctx) return;

        try {
            const data = await this.getWeeklyAlertsData();
            
            this.charts.weeklyAlerts = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: data.labels,
                    datasets: [{
                        label: 'Alerts',
                        data: data.alerts,
                        backgroundColor: this.colors.danger,
                        borderColor: this.colors.danger,
                        borderWidth: 1
                    }, {
                        label: 'Feedback',
                        data: data.feedback,
                        backgroundColor: this.colors.info,
                        borderColor: this.colors.info,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Weekly Alerts & Feedback Volume',
                            font: {
                                size: 16,
                                weight: 'bold'
                            },
                            color: this.colors.dark
                        },
                        legend: {
                            position: 'top',
                            labels: {
                                color: this.colors.dark
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: this.hexToRgba(this.colors.dark, 0.1)
                            },
                            ticks: {
                                color: this.colors.dark
                            }
                        },
                        x: {
                            grid: {
                                color: this.hexToRgba(this.colors.dark, 0.1)
                            },
                            ticks: {
                                color: this.colors.dark
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error creating weekly alerts chart:', error);
        }
    }

    // Enhanced speed analysis chart
    async createSpeedAnalysisChart() {
        const ctx = document.getElementById('speedChart');
        if (!ctx) return;

        try {
            const data = await this.getSpeedAnalysisData();
            
            this.charts.speedAnalysis = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.labels,
                    datasets: [{
                        label: 'Average Speed',
                        data: data.averageSpeed,
                        borderColor: this.colors.success,
                        backgroundColor: this.hexToRgba(this.colors.success, 0.1),
                        borderWidth: 3,
                        fill: false,
                        tension: 0.4
                    }, {
                        label: 'Max Speed',
                        data: data.maxSpeed,
                        borderColor: this.colors.warning,
                        backgroundColor: this.hexToRgba(this.colors.warning, 0.1),
                        borderWidth: 3,
                        fill: false,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Speed Analysis',
                            font: {
                                size: 16,
                                weight: 'bold'
                            },
                            color: this.colors.dark
                        },
                        legend: {
                            position: 'top',
                            labels: {
                                color: this.colors.dark
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: this.hexToRgba(this.colors.dark, 0.1)
                            },
                            ticks: {
                                color: this.colors.dark
                            }
                        },
                        x: {
                            grid: {
                                color: this.hexToRgba(this.colors.dark, 0.1)
                            },
                            ticks: {
                                color: this.colors.dark
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error creating speed analysis chart:', error);
        }
    }

    // Route analysis chart
    async createRouteAnalysisChart() {
        const ctx = document.getElementById('routeChart');
        if (!ctx) return;

        try {
            const data = await this.getRouteAnalysisData();
            
            this.charts.routeAnalysis = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: data.labels,
                    datasets: [{
                        label: 'Route Performance',
                        data: data.values,
                        backgroundColor: data.values.map(value => 
                            value > 80 ? this.colors.success : 
                            value > 60 ? this.colors.warning : this.colors.danger
                        ),
                        borderColor: data.values.map(value => 
                            value > 80 ? this.colors.success : 
                            value > 60 ? this.colors.warning : this.colors.danger
                        ),
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Route Performance Analysis',
                            font: {
                                size: 16,
                                weight: 'bold'
                            },
                            color: this.colors.dark
                        },
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            grid: {
                                color: this.hexToRgba(this.colors.dark, 0.1)
                            },
                            ticks: {
                                color: this.colors.dark
                            }
                        },
                        x: {
                            grid: {
                                color: this.hexToRgba(this.colors.dark, 0.1)
                            },
                            ticks: {
                                color: this.colors.dark
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error creating route analysis chart:', error);
        }
    }

    // Data fetching methods
    async getDailyActiveVehiclesData() {
        // Simulate data fetching from Firebase
        const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const values = [12, 15, 18, 14, 20, 16, 13];
        
        return { labels, values };
    }

    async getVehicleTypeDistributionData() {
        // Simulate data fetching from Firebase
        const labels = ['City Bus', 'Express Bus', 'Mini Bus', 'Shuttle', 'Other'];
        const values = [45, 25, 15, 10, 5];
        
        return { labels, values };
    }

    async getWeeklyAlertsData() {
        // Simulate data fetching from Firebase
        const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const alerts = [3, 5, 2, 7, 4, 1, 2];
        const feedback = [8, 12, 15, 10, 18, 14, 9];
        
        return { labels, alerts, feedback };
    }

    async getSpeedAnalysisData() {
        // Simulate data fetching from Firebase
        const labels = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
        const averageSpeed = [35, 30, 45, 50, 40, 38];
        const maxSpeed = [50, 45, 65, 70, 60, 55];
        
        return { labels, averageSpeed, maxSpeed };
    }

    async getRouteAnalysisData() {
        // Simulate data fetching from Firebase
        const labels = ['Route A', 'Route B', 'Route C', 'Route D', 'Route E'];
        const values = [85, 72, 90, 65, 78];
        
        return { labels, values };
    }

    // Utility method to convert hex to rgba
    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // Update chart data
    updateChartData(chartName, newData) {
        if (this.charts[chartName]) {
            this.charts[chartName].data = newData;
            this.charts[chartName].update();
        }
    }

    // Destroy all charts
    destroyCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.destroy();
            }
        });
        this.charts = {};
    }
}

// Initialize charts when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const dashboardCharts = new DashboardCharts();
    dashboardCharts.initializeCharts();
    
    // Make it globally accessible
    window.dashboardCharts = dashboardCharts;
}); 