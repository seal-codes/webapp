gen-ed25519:
	mkdir -p ed25519 && \
	openssl genpkey -algorithm ed25519 -out ./ed25519/private.pem && \
	openssl pkey -in ./ed25519/private.pem -pubout -out ./ed25519/public.pem
