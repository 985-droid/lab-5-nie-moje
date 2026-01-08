import asyncio
import signal
import logging
import sys
from opentelemetry import trace
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.exporter.otlp.proto.grpc._log_exporter import OTLPLogExporter
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry._logs import set_logger_provider, get_logger

from services.worker import MessageWorker
from config.external_config import external_config

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

trace.set_tracer_provider(
    TracerProvider(
        resource=Resource.create({"service.name": "external-worker"})
    )
)
otlp_exporter = OTLPSpanExporter(endpoint="http://otel_collector:4317", insecure=True)
span_processor = BatchSpanProcessor(otlp_exporter)
trace.get_tracer_provider().add_span_processor(span_processor)

logger_provider = LoggerProvider(
    resource=Resource.create({"service.name": "external-worker"})
)
set_logger_provider(logger_provider)

otlp_log_exporter = OTLPLogExporter(endpoint="http://otel_collector:4317", insecure=True)
logger_provider.add_log_record_processor(BatchLogRecordProcessor(otlp_log_exporter))

handler = LoggingHandler(level=logging.INFO, logger_provider=logger_provider)
logging.getLogger().addHandler(handler)
logging.getLogger().setLevel(logging.INFO)


class WorkerService:
    def __init__(self):
        self.worker = MessageWorker()
        self.shutdown_event = asyncio.Event()
    
    def setup_signal_handlers(self):
        def signal_handler(signum, frame):
            logger.info(f"Received signal {signum}, initiating shutdown...")
            asyncio.create_task(self.shutdown())
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
    
    async def shutdown(self):
        logger.info("Shutting down worker service...")
        await self.worker.stop()
        self.shutdown_event.set()
    
    async def run(self):
        self.setup_signal_handlers()
        
        try:
            logger.info(
                f"Worker service starting with broker: {external_config.queue_broker}",
                extra={
                    "broker": external_config.queue_broker,
                    "service": "external-worker"
                }
            )
            
            await self.worker.start()
        except Exception as e:
            logger.error(
                f"Worker service error: {e}",
                exc_info=True,
                extra={"error": str(e)}
            )
            raise
        finally:
            logger.info("Worker service stopped")


async def main():
    service = WorkerService()
    await service.run()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Worker interrupted by user")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)

