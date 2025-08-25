import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:healthmobi/api/api_provider.dart';
import 'package:healthmobi/models/medication_course_model.dart';
import 'package:healthmobi/provider/medication_course_provider.dart';
import 'package:healthmobi/provider/medication_course_state_provider.dart';
import 'package:healthmobi/reusable/constant.dart';
import 'package:healthmobi/widget/skeleton_placeholder.dart';
import 'package:resize/resize.dart';

import '../widget/medication_medi_screen_card.dart';

class HistoryScreen extends ConsumerStatefulWidget {
  const HistoryScreen({super.key});

  @override
  ConsumerState<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends ConsumerState<HistoryScreen> {
  @override
  void initState() {
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    ApiState medicationCourseState = ref.watch(medicationCourseStateProvider);
    MedicationCourseModel? medicationCourse =
        ref.watch(medicationCourseProvider);
    return SafeArea(
      child: Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0,
          centerTitle: true,
          scrolledUnderElevation: 0,
          title: Text(
            "Medication History",
            style: GoogleFonts.manrope(
              color: Colors.black,
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        body: Container(
          alignment: Alignment.center,
          padding: EdgeInsets.only(top: 19.h, left: 16.w, right: 16.w),
          child: SingleChildScrollView(
            child: Column(
              children: [
                // ElevatedButton(
                //     onPressed: () {},
                //     //edit button
                //     child: Text("Edit History"),
                //     style: ElevatedButton.styleFrom(
                //       backgroundColor: primaryColor,
                //       foregroundColor: Colors.white,
                //       shape: RoundedRectangleBorder(
                //         borderRadius: BorderRadius.circular(10),
                //       ),
                //     )),

                medicationCourseState == ApiState.loading
                    ? SkeletonScreen()
                    : medicationCourseState == ApiState.error
                        ? Column(
                            spacing: 20,
                            children: [
                              MedicationMediScreenCard(
                                  name: "Calpol 650mg",
                                  doses: 2,
                                  isafternoon: true,
                                  ismorning: true,
                                  isnight: true,
                                  isevening: true,
                                  desctiption: "After meal"),
                              MedicationMediScreenCard(
                                  name: "Paracetamol 500mg",
                                  doses: 1,
                                  ismorning: true,
                                  isnight: true,
                                  desctiption: "Before meal"),
                              MedicationMediScreenCard(
                                  name: "Dolo 650mg",
                                  doses: 1,
                                  ismorning: true,
                                  desctiption: "After meal"),
                              MedicationMediScreenCard(
                                  name: "Crocin 650mg",
                                  doses: 1,
                                  isnight: true,
                                  desctiption: "After meal"),
                            ],
                          )
                        : Column(
                            spacing: 20,
                            children:
                                medicationCourse?.courses != null ||
                                        medicationCourse!.courses!.isNotEmpty
                                    ? medicationCourse!.courses!.map(
                                        (e) {
                                          return Column(
                                            children: [
                                              Row(
                                                children: [
                                                  Text(
                                                    "21-3-2025 Course",
                                                    style: GoogleFonts.manrope(
                                                        fontSize: 16,
                                                        fontWeight:
                                                            FontWeight.bold),
                                                  ),
                                                ],
                                              ),
                                              SizedBox(
                                                height: 10,
                                              ),
                                              Column(
                                                  spacing: 20,
                                                  children:
                                                      e.medicineCourses !=
                                                                  null ||
                                                              e.medicineCourses!
                                                                  .isNotEmpty
                                                          ? e.medicineCourses!
                                                              .map(
                                                                (med) =>
                                                                    MedicationMediScreenCard(
                                                                  name:
                                                                      med.medicineName ??
                                                                          "",
                                                                  doses:
                                                                      med.pillcount ??
                                                                          1,
                                                                  desctiption: med
                                                                              .medtype ==
                                                                          "0"
                                                                      ? "Before Meal"
                                                                      : med.medtype ==
                                                                              "1"
                                                                          ? "After Meal"
                                                                          : "",
                                                                  ismorning:
                                                                      med.frequency?[0] ==
                                                                              "1"
                                                                          ? true
                                                                          : false,
                                                                  isafternoon:
                                                                      med.frequency?[1] ==
                                                                              "1"
                                                                          ? true
                                                                          : false,
                                                                  isevening:
                                                                      med.frequency?[2] ==
                                                                              "1"
                                                                          ? true
                                                                          : false,
                                                                  isnight:
                                                                      med.frequency?[3] ==
                                                                              "1"
                                                                          ? true
                                                                          : false,
                                                                ),
                                                              )
                                                              .toList()
                                                          : [])
                                            ],
                                          );
                                        },
                                      ).toList()
                                    : [
                                        Text(
                                          "No ongoing Medication course",
                                          style: GoogleFonts.manrope(
                                            color: fontColor,
                                            fontSize: 16,
                                          ),
                                        )
                                      ])
              ],
            ),
          ),
        ),
      ),
    );
  }
}
