import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './components/navbar/navbar';
import { Footer } from './components/footer/footer';
import { AuthService } from './services/auth.service';
import { SessionMonitorService } from './services/session-monitor.service';

@Component({
  imports: [RouterOutlet, Navbar, Footer],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  constructor(
    public auth: AuthService,
    sessionMonitor: SessionMonitorService,
  ) {
    sessionMonitor.start();
  }
}
