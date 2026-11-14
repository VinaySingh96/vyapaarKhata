// vyapaarKhata Windows Host Management Supervisor Agent
// Manages WSL2 lifecycle, nerdctl containers, firewall rules, and health monitoring.
package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"time"
)

const (
	ServiceName = "vyapaarkhata-supervisor"
	DisplayName = "vyapaarKhata Retail Host Supervisor"
	Description = "Supervises offline retail container stack and local database on Windows."
	HealthURL   = "http://localhost:3000/health"
)

type Supervisor struct {
	ctx    context.Context
	cancel context.CancelFunc
}

func NewSupervisor() *Supervisor {
	ctx, cancel := context.WithCancel(context.Background())
	return &Supervisor{ctx: ctx, cancel: cancel}
}

// StartStack initiates nerdctl compose inside the WSL2 distribution
func (s *Supervisor) StartStack() error {
	log.Println("[Supervisor] Starting vyapaarKhata container stack via nerdctl...")
	cmd := exec.Command("wsl", "-d", "vyapaarkhata-runtime", "nerdctl", "compose", "-f", "/opt/vyapaarkhata/docker-compose.nerdctl.yaml", "up", "-d")
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to start stack: %v, output: %s", err, string(output))
	}
	log.Printf("[Supervisor] Container stack started successfully: %s", string(output))
	return nil
}

// StopStack gracefully shuts down containers
func (s *Supervisor) StopStack() error {
	log.Println("[Supervisor] Stopping vyapaarKhata container stack...")
	cmd := exec.Command("wsl", "-d", "vyapaarkhata-runtime", "nerdctl", "compose", "-f", "/opt/vyapaarkhata/docker-compose.nerdctl.yaml", "stop")
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to stop stack: %v, output: %s", err, string(output))
	}
	log.Printf("[Supervisor] Container stack stopped: %s", string(output))
	return nil
}

// ConfigureFirewall sets up Windows Defender Firewall rule for LAN counter billing
func (s *Supervisor) ConfigureFirewall() {
	cmd := exec.Command("netsh", "advfirewall", "firewall", "add", "rule", "name=vyapaarKhata LAN", "dir=in", "action=allow", "protocol=TCP", "localport=80,443")
	if out, err := cmd.CombinedOutput(); err != nil {
		log.Printf("[Supervisor] Warning: Could not configure firewall rule: %v (%s)", err, string(out))
	} else {
		log.Println("[Supervisor] Windows Firewall rule configured for ports 80/443.")
	}
}

// MonitorLoop periodically polls the local API health endpoint
func (s *Supervisor) MonitorLoop() {
	client := &http.Client{Timeout: 3 * time.Second}
	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-s.ctx.Done():
			return
		case <-ticker.C:
			resp, err := client.Get(HealthURL)
			if err != nil || resp.StatusCode != http.StatusOK {
				log.Printf("[Supervisor] Warning: Health check failed: %v", err)
			} else {
				resp.Body.Close()
			}
		}
	}
}

func main() {
	log.Printf("[Supervisor] %s initialized on Windows Host.", DisplayName)
	supervisor := NewSupervisor()

	// In production, integration with golang.org/x/sys/windows/svc runs as Windows Service.
	// For standalone invocation:
	if len(os.Args) > 1 && os.Args[1] == "run" {
		supervisor.ConfigureFirewall()
		if err := supervisor.StartStack(); err != nil {
			log.Fatalf("[Supervisor] Error starting stack: %v", err)
		}
		supervisor.MonitorLoop()
	} else {
		fmt.Printf("Usage: %s run\n", os.Args[0])
	}
}
