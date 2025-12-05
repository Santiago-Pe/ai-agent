'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { ErrorBoundaryProps, ErrorBoundaryState } from './interfaces';
import { errorBoundaryStyles } from './styles';

/**
 * ErrorBoundary - Componente de clase
 *
 * JUSTIFICACIÓN: Este componente DEBE ser una clase porque React Error Boundaries
 * requiere métodos de ciclo de vida específicos que solo están disponibles en class components:
 * - static getDerivedStateFromError(): Actualiza el estado cuando ocurre un error
 * - componentDidCatch(): Permite logging y side effects cuando se captura un error
 *
 * React NO soporta Error Boundaries con hooks/functional components aún.
 * Ref: https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error boundary caught an error:', error, errorInfo);

    // TODO: Aquí podrías enviar el error a un servicio de logging
    // logErrorToService(error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className={errorBoundaryStyles.container}>
          <div className={errorBoundaryStyles.card}>
            <div className={errorBoundaryStyles.iconWrapper}>
              <AlertTriangle className={errorBoundaryStyles.icon} />
            </div>
            <h1 className={errorBoundaryStyles.title}>
              Algo salió mal
            </h1>
            <p className={errorBoundaryStyles.description}>
              Ocurrió un error inesperado. Por favor, recarga la página e intenta nuevamente.
            </p>
            <button
              onClick={this.handleReload}
              className={errorBoundaryStyles.reloadButton}
            >
              <RefreshCw className={errorBoundaryStyles.reloadIcon} />
              Recargar página
            </button>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className={errorBoundaryStyles.errorDetails.container}>
                <summary className={errorBoundaryStyles.errorDetails.summary}>
                  Detalles del error (desarrollo)
                </summary>
                <pre className={errorBoundaryStyles.errorDetails.pre}>
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}