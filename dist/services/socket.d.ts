import { Server as HTTPServer } from 'http';
export declare class SocketService {
    private static io;
    static init(server: HTTPServer): void;
    private static setupEventHandlers;
    static notifyNewReview(merchantId: number, review: any): void;
    static notifyLotteryResult(merchantId: number, result: any): void;
}
export default SocketService;
//# sourceMappingURL=socket.d.ts.map