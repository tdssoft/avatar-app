FROM supabase/edge-runtime:v1.70.0

# The edge runtime expects:
# - /home/deno/functions/main (router)
# - /home/deno/functions/<function-name>/index.ts
COPY functions /home/deno/functions

# Railway private networking expects the process to listen on 0.0.0.0.
# Hardcode the port so Kong can reliably proxy to it.
CMD ["start", "--ip", "0.0.0.0", "--port", "9000", "--main-service", "/home/deno/functions/main"]
