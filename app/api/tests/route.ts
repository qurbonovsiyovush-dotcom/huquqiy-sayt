952
953
954
955
956
957
958
959
960
961
962
963
964
965
966
967
968
969
970
971
972
973
974
975
976
977
978
979
980
981
982
983
984
985
986
987
988
989
990
991
992
993
994
995
996
997
998
999
1000
1001
1002
1003
1004
1005
1006
1007
1008
1009
1010
1011
import { NextRequest, NextResponse } from "next/server";
    const action =
      String(
        body?.action || ""
      );

    if (
      action ===
      "create-chunked-test"
    ) {
      return await createChunkedTest(
        body
      );
    }

    if (
      action ===
      "append-questions"
    ) {
      return await appendQuestionsChunk(
        body
      );
    }

    if (
      action ===
      "finalize-chunked-test"
    ) {
      return await finalizeChunkedTest(
        body
      );
    }

    /*
      Eski test editor ishlashi uchun
      oddiy POST saqlanib qoladi.
    */
    return await createNormalTest(
      body
    );
  } catch (error) {
    console.error(
      "POST /api/tests ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Testni yaratishda server xatosi.",
      },
      {
        status: 500,
      }
    );
  }
}
