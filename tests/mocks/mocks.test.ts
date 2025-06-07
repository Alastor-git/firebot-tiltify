import "@/mocks/firebot-modules";
import { logger } from "../../src/shared/firebot-modules";

test("tests mocks of the logger", () => {
    const expectedMessage: string = "test";
    logger.debug(expectedMessage);

    expect(logger.debug).toHaveBeenCalledTimes(1);
    expect(logger.debug).toHaveBeenCalledWith(expectedMessage);

    logger.info(expectedMessage);

    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(expectedMessage);

    logger.warn(expectedMessage);

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(expectedMessage);

    logger.error(expectedMessage);

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(expectedMessage);
});