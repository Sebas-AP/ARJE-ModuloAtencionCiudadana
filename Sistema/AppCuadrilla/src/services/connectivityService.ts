export interface ConnectivityState {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
}

export interface ConnectivitySource {
  addEventListener(listener: (state: ConnectivityState) => void): () => void;
}

function nativeConnectivitySource(): ConnectivitySource {
  return require('@react-native-community/netinfo') as ConnectivitySource;
}

export function subscribeToConnectivity(
  onChange: (online: boolean) => void,
  source: ConnectivitySource = nativeConnectivitySource(),
): () => void {
  return source.addEventListener((state) => {
    onChange(state.isConnected === true && state.isInternetReachable !== false);
  });
}
